const express = require('express');
const errorhandler = require('express-async-handler');
const bodyParser = require('body-parser');
const compression = require('compression');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const https = require('https');
const zlib = require('zlib');
process.on('uncaughtException', function (error) {
   console.log(error.stack);
   LogFile.write(error.stack + "\n");
});
var Flare = express();

let ServerConfig = {}
if (fs.existsSync('./config.json')) {
	ServerConfig = JSON.parse(fs.readFileSync('./config.json'));
}
else {
	ServerConfig = {
		'URL': "127.0.0.1",
		'Port': 9050,
		'CDNURL': "https://cdn-production-cf.toco.tales-ch.jp", 
		'SSL': false,
		'Certs': {
			'key': "/path/to/key.pem",
			'cert': "/path/to/cert.pem",
			'ca': "/path/to/chain.pem"
		}
	}
	fs.writeFileSync('./config.json', JSON.stringify(ServerConfig, null, 2));
}

const StaticIndex = JSON.parse(fs.readFileSync('./Library/Function/StaticIndex.json'));

function AccountExists(ID) {
	if (fs.existsSync('./Library/Database/Account' + String(ID) + ".json.gz")) { return true; }
	return false;
}
function ReadAccount(ID) {
	return JSON.parse(zlib.gunzipSync(fs.readFileSync('./Library/Database/Account/' + String(ID) + ".json.gz")));
}
function WriteAccount(ID, Data) {
	fs.writeFileSync('./Library/Database/Account/' + String(ID) + ".json.gz", zlib.gzipSync(JSON.stringify(Data)));
	return 0;
}
function ReadIndex(SessionID) {
	return JSON.parse(zlib.gunzipSync(fs.readFileSync('./Library/Database/Index/' + String(SessionID) + ".json.gz")));
}
function WriteIndex(SessionID, Data) {
	fs.writeFileSync('./Library/Database/Index/' + String(SessionID) + ".json.gz", zlib.gzipSync(JSON.stringify(Data)));
	return 0;
}

function GetDayBegin() {
	let Now = new Date();
	const BeginDay = new Date(Now.getFullYear(), Now.getMonth(), Now.getDate());
	return (BeginDay / 1000);
}
function GetDayNo() {
	let Now = new Date();
	const DateYear = String(Now.getFullYear()).slice(-2);
	const DateMonth = ("0" + String(Now.getMonth() + 1)).slice(-2);
	const DateDay = ("0" + String(Now.getDate())).slice(-2);
	const Flaretted = parseInt(DateYear + DateMonth + DateDay);
	return Flaretted;
}
function GetDayEnd() {
	let Now = new Date();
	const EndDay = new Date(Now.getFullYear(), Now.getMonth(), Now.getDate() + 1);
	return (EndDay / 1000);
}
function PrettyTime(TimeData) {
	const Hour = Math.floor(TimeData / 3600);
	const Min = Math.floor((TimeData % 3600) / 60);
	const Sec = Math.floor(TimeData % 60);
	let Time = "";
	if (Hour > 0) { Time += "" + Hour + ":" + (Min < 10 ? "0" : ""); }
	Time += "" + Min + ":" + (Sec < 10 ? "0" : "");
	Time += "" + Sec;
	return Time;
}
let LastServerReset = GetDayBegin();
let NextServerReset = 86400 - (Math.floor(Date.now() / 1000) - LastServerReset);
let DayEnd = GetDayEnd();
let DayNumber = GetDayNo();
function GetCurrentDate() {
	const date = new Date();
	return date.toUTCString();
}
const Passphrase = crypto.createHash('md5').update(String(Math.floor(Date.now() * Math.random() * 1000))).digest('hex');
fs.writeFileSync('./passphrase.txt', Passphrase + "\n");
let LogFile = fs.createWriteStream('./Library/Log/URL_' + LastServerReset + '.txt');
async function RecordManager(req, res, next) {
	LogFile.write(req.url + "\n");
	res.locals.ResponseBody = {
		'error_code': 0,
		'message': {}
	}
	
	if (req.url.includes("/../")) { res.end(); return; }
	else if (req.url.includes("/utility/")) {
		if (req.get('passphrase') != Passphrase) { res.end("Denied.\n"); return; }
		next();
		return;
	}
	
	if (req.get('cookie') != undefined && req.get('cookie').includes("_session_id")) {
		const Split1 = req.get('cookie').split(" ");
		for (const x in Split1) {
			if (Split1[x].startsWith("_session_id")) {
				res.locals.SessionID = Split1[x].slice(12, Split1[x].length -1);
			}
		}
	}
	
	next();
}

const AssetList = JSON.parse(fs.readFileSync('./Library/Event/AssetList.json'));
const ConsentView = fs.readFileSync('./Library/Function/Consent/View');
const ConsentApply = fs.readFileSync('./Library/Function/Consent/Apply');

Flare.use(bodyParser.json({ type: ['application/json'], limit: "6mb" }));
Flare.use(compression());
Flare.use(express.static('static'));
Flare.use(RecordManager);
Flare.disable('x-powered-by');
let server = {};
if (ServerConfig['SSL'] == true) {
	server = https.createServer({
			key: fs.readFileSync(ServerConfig['Certs']['key']),
			cert: fs.readFileSync(ServerConfig['Certs']['cert']),
			ca: fs.readFileSync(ServerConfig['Certs']['ca'])
		}, Flare).listen(ServerConfig['Port'], function() {
		console.log("Flare online. Server passphrase is " + Passphrase);
	});	
}
else {
	server = http.createServer(Flare).listen(ServerConfig['Port'], function() {
		console.log("Flare online. Passphrase: " + Passphrase);
	});
}

// ----------------------- Start Consent/Privacy -------------------------------------
Flare.get("/toco-rays/public/Web/legal_ios/TOS/TOSversionNEJP2.txt", async (req, res) => {
	res.end("202202280000,200107112359,200107112359,https://flare.cherrymint.live/terms/nejp,https://flare.cherrymint.live/privacy/?lang=jp,https://flare.cherrymint.live/privacy/global_cnsnt,https://flare.cherrymint.live/privacy/Trackingdetail");

});
Flare.post("/api/chkApp", async (req, res) => {
	const Serialized = JSON.stringify({
		'message': "success",
		'status': 200
	});
	res.set({'content-type': "text/plain;charset=ISO-8859-1", 'content-length': Serialized.length});
	res.end(Serialized);
});
Flare.post("/npggm/service.do", async (req, res) => {
	const Serialized = "11603404";
	res.set({'content-type': "text/plain;charset=ISO-8859-1", 'content-length': Serialized.length});
	res.end(Serialized);
});
Flare.get("/api/v1/consent_infos", async (req, res) => {
	const Serialized = JSON.stringify({
		'results': {
			"details": [
				{
					'consent_flg': 1,
					'consent_type': 2
				},
				{
					'consent_flg': 1,
					'consent_type': 1
				}
			],
			'user_id': req.query.user_id
		},
		'ok': true
	});
	res.set({'content-type': "application/json", 'content-length': Serialized.length});
	res.end(Serialized);
});
Flare.post("/api/v1/consent/request", async (req, res) => {
	const Serialized = JSON.stringify({
		'ok': true,
		'results': {
			'url': "https://" + ServerConfig['URL'] + "/api/v1/consent/view"
		}
	});
	res.set({'content-type': "application/json", 'content-length': Serialized.length});
	res.end(Serialized);
});
Flare.get("/api/v1/consent/view", async (req, res) => {
	res.set({'content-type': 'text/html', 'content-length': ConsentApply.length});
	res.end(ConsentApply);
});
Flare.post("/api/v1/consent/apply", async (req, res) => {
	res.set({'content-type': 'text/html', 'content-length': ConsentApply.length});
	res.end(ConsentApply);
});
// ----------------------- End Consent/Privacy ---------------------------------------

Flare.post("/game_server/api/versions/info", errorhandler(async (req, res, next) => {
	const PlatformID = parseInt(req.get("x-inu-application-platform"));
	let UpdateURL = "https://play.google.com/store/apps/details?id=com.bandainamcoent.torays";
	if (PlatformID == 1) {
		UpdateURL = "https://itunes.apple.com/jp/app/teiruzu-obu-za-reizu/id1113231866?mt=8";
	}
	res.locals.ResponseBody['message'] = {
		'asset_bundle_directory': AssetList['Directory'],
		'asset_version': AssetList['Version'],
		'platform_type': PlatformID,
		'proto_ver': AssetList['ProtoVersion'],
		's3_url': ServerConfig['CDNURL'],
		'server_url': "https://" + ServerConfig['URL'],
		'update_url': UpdateURL
	}
	next();
}));
Flare.post("/game_server/api/maintenances/check", async (req, res, next) => {
	next();
});

Flare.post("/game_server/api/users/login", errorhandler(async (req, res) => {
	if (AccountExists(req.body['message']['user_id'])) {
		const UserAccount = ReadAccount(req.body['message']['user_id']);
		const UserIndex = ReadIndex(UserAccount['SessionID']);
		res.locals.ResponseBody['message'] = UserIndex['Account'];
		res.locals.ResponseBody['message']['server_time'] = Math.floor(Date.now() / 1000);
		res.set({
			'Set-Cookie': "_session_id=" + UserAccount['SessionID']
		});
	}
	else {
		let UserID = 1000001;
		let FriendID = 9000001;
		const UserCount = fs.readdirSync('./Library/Database/Index/');
		if (UserCount > 0) {
			UserID += UserCount;
			FriendID += UserCount;
		}
		
		const TimeNow = Math.floor(Date.now() / 1000);
		const Password = crypto.createHash('md5').update(String(UserID * TimeNow)).digest('hex').toString('base64');
		const SessionID = crypto.randomBytes(32).toString("hex");
		const NewAccountData = {
			'ID': UserID,
			'FriendID': FriendID,
			'Password': Password,
			'SessionID': SessionID,
			'CreatedAt': TimeNow
		}
		const NewIndexData = {
			'ID': UserID,
			'FriendID': FriendID,
			'Password': Password,
			'SessionID': SessionID,
			'CreatedAt': TimeNow,
			'Account': {
				"battling_mst_hard_tower_id": 0,
				"battling_mst_knockout_tower_id": 0,
				"battling_mst_tower_id": 0,
				"inquiry_parameter": {
					"delete_encrypt_key": "deletion_totr",
					"delete_link": "0x0x",
					"encrypt_key": "talesoftherays",
					"link": "x0x0"
				},
				"quest_current": {
					"ap_multiple_rate": 1,
					"continue_num": 0,
					"current_quest_id": 171011,
					"mst_agency_food_effect_ids": [],
					"old_quest_id": 171011,
					"overray_flag": false,
					"quest_flag": false,
					"support_lock_flag": false
				},
				"server_time": 0,
				"user": {
					"advantage_item_use": null,
					"age": 21,
					"ap": 9999,
					"ap_max": 9999,
					"ap_orb": 9999,
					"ap_recovery_at": 1722146572,
					"auto_mirrorge_arte_reinforces": [
						{
							"mirrorge_type": 0,
							"num": 109,
							"rank": 6
						},
						{
							"mirrorge_type": 1001,
							"num": 49,
							"rank": 5
						},
						{
							"mirrorge_type": 1002,
							"num": 35,
							"rank": 5
						},
						{
							"mirrorge_type": 1003,
							"num": 24,
							"rank": 3
						},
						{
							"mirrorge_type": 1004,
							"num": 77,
							"rank": 6
						},
						{
							"mirrorge_type": 1005,
							"num": 30,
							"rank": 6
						},
						{
							"mirrorge_type": 1006,
							"num": 47,
							"rank": 5
						},
						{
							"mirrorge_type": 1007,
							"num": 24,
							"rank": 3
						}
					],
					"birthday": 0,
					"bnid_combine": true,
					"chara_buff": {
						"cc": 5,
						"critical": 0.0,
						"hp": 300,
						"m_attack": 250,
						"p_attack": 250
					},
					"created_at": TimeNow,
					"diamond": 7,
					"equip_awake_statuses": null,
					"fragment": 9999999,
					"friend_code": 937094195,
					"friend_point": 13290,
					"gald": 592396802,
					"jewel": 9999999,
					"jewel_free": 0,
					"jewel_pay": 0,
					"knockout_tower_point": 245835,
					"last_login_at": 1722146572,
					"message": "Hi there!",
					"mst_honor_id": 90009,
					"name": "Ix",
					"overray": 4,
					"overray_max": 4,
					"overray_recovery_at": 1722146572,
					"passport_expired_at": 1607530681,
					"prism": 9999999,
					"scenario_part": 4,
					"tower_point": 1601,
					"tutorial_flag": false,
					"tutorial_phase": 4111,
					"user_voice_packs": [
						191226,
						2107091,
						2204181,
						2304219
					]
				}
			},
			'Index': StaticIndex
		}
		WriteAccount(UserID, NewAccountData);
		WriteIndex(SessionID, NewIndexData);
		
		res.locals.ResponseBody['message'] = NewIndexData['Account'];
		res.set({
			'Set-Cookie': "_session_id=" + NewIndexData['SessionID']
		});
	}
	const Serialized = JSON.stringify(res.locals.ResponseBody);
	res.end(Serialized);
}));
Flare.post("/game_server/api/users/status", async (req, res, next) => {
	const UserAccount = ReadAccount(req.body['message']['user_id']);
	const UserIndex = ReadIndex(UserAccount['SessionID']);
	res.locals.ResponseBody['message'] = UserIndex['Account']['user'];
	next();
});

Flare.post("/game_server/api/transfers/transfer_prepare", async (req, res, next) => {
	res.locals.ResponseBody['message'] = {
		'transfer_code': crypto.randomUUID(),
		'transfer_status': 0
	}
	next();
});
Flare.post("/game_server/webview/transfers/transfer_start/*", async (req, res) => {
	const URLSplit = req.url.split("/");
	const TransferCode = URLSplit[URLSplit.length - 1];
	const RedirectURL = "https://" + ServerConfig['URL'] + "/game_server/webview/transfers/transfer_exec/" + TransferCode;
	
	res.status = 302;
	res.set({
		'content-type': "text/html; charset=utf-8",
		'location': RedirectURL
	});
	res.end('<html><body>You are being <a href="' + RedirectURL +'">redirected</a>.</body></html>');
});
Flare.post("/game_server/webview/transfers/transfer_exec/*", async (req, res) => {
	const URLSplit = req.url.split("/");
	const TransferCode = URLSplit[URLSplit.length - 1];
	
	res.set({
		'content-type': "text/html; charset=utf-8",
	});
	res.end('<!DOCTYPE html><html><head><script>window.onload = function(){location.href="uniwebview://transfer.1.' + TransferCode + '";}</script></head><body></body></html>');
});
Flare.post("/game_server/api/transfers/transfer_complete", async (req, res, next) => {
	let UserID = 1000001;
	let FriendID = 9000001;
	const UserCount = fs.readdirSync('./Library/Database/Index/');
	if (UserCount > 0) {
		UserID += UserCount;
		FriendID += UserCount;
	}
	
	const TimeNow = Math.floor(Date.now() / 1000);
	const Password = crypto.createHash('md5').update(String(UserID * TimeNow)).digest('hex').toString('base64');
	const SessionID = crypto.randomBytes(32).toString("hex");
	const NewAccountData = {
		'ID': UserID,
		'FriendID': FriendID,
		'Password': Password,
		'SessionID': SessionID,
		'CreatedAt': TimeNow
	}
	const NewIndexData = {
		'ID': UserID,
		'FriendID': FriendID,
		'Password': Password,
		'SessionID': SessionID,
		'CreatedAt': TimeNow,
		'Account': {
			"battling_mst_hard_tower_id": 0,
			"battling_mst_knockout_tower_id": 0,
			"battling_mst_tower_id": 0,
			"inquiry_parameter": {
				"delete_encrypt_key": "deletion_totr",
				"delete_link": "0x0x",
				"encrypt_key": "talesoftherays",
				"link": "x0x0"
			},
			"quest_current": {
				"ap_multiple_rate": 1,
				"continue_num": 0,
				"current_quest_id": 171011,
				"mst_agency_food_effect_ids": [],
				"old_quest_id": 171011,
				"overray_flag": false,
				"quest_flag": false,
				"support_lock_flag": false
			},
			"server_time": 0,
			"user": {
				"advantage_item_use": null,
				"age": 21,
				"ap": 9999,
				"ap_max": 9999,
				"ap_orb": 9999,
				"ap_recovery_at": 1722146572,
				"auto_mirrorge_arte_reinforces": [
					{
						"mirrorge_type": 0,
						"num": 109,
						"rank": 6
					},
					{
						"mirrorge_type": 1001,
						"num": 49,
						"rank": 5
					},
					{
						"mirrorge_type": 1002,
						"num": 35,
						"rank": 5
					},
					{
						"mirrorge_type": 1003,
						"num": 24,
						"rank": 3
					},
					{
						"mirrorge_type": 1004,
						"num": 77,
						"rank": 6
					},
					{
						"mirrorge_type": 1005,
						"num": 30,
						"rank": 6
					},
					{
						"mirrorge_type": 1006,
						"num": 47,
						"rank": 5
					},
					{
						"mirrorge_type": 1007,
						"num": 24,
						"rank": 3
					}
				],
				"birthday": 0,
				"bnid_combine": true,
				"chara_buff": {
					"cc": 5,
					"critical": 0.0,
					"hp": 300,
					"m_attack": 250,
					"p_attack": 250
				},
				"created_at": TimeNow,
				"diamond": 7,
				"equip_awake_statuses": null,
				"fragment": 9999999,
				"friend_code": 937094195,
				"friend_point": 13290,
				"gald": 592396802,
				"jewel": 9999999,
				"jewel_free": 0,
				"jewel_pay": 0,
				"knockout_tower_point": 245835,
				"last_login_at": 1722146572,
				"message": "Hi there!",
				"mst_honor_id": 90009,
				"name": "Ix",
				"overray": 4,
				"overray_max": 4,
				"overray_recovery_at": 1722146572,
				"passport_expired_at": 1607530681,
				"prism": 9999999,
				"scenario_part": 4,
				"tower_point": 1601,
				"tutorial_flag": false,
				"tutorial_phase": 4111,
				"user_voice_packs": [
					191226,
					2107091,
					2204181,
					2304219
				]
			}
		},
		'Index': StaticIndex
	}
	WriteAccount(UserID, NewAccountData);
	WriteIndex(SessionID, NewIndexData);
	
	res.locals.ResponseBody['message'] = {
		'friend_code': FriendID,
		'password': Password,
		'user_id': UserID
	}
	next();
});

Flare.post("/game_server/api/transfers/setup_info", async (req, res, next) => {
	const UserIndex = ReadIndex(res.locals.SessionID);
	res.locals.ResponseBody['message'] = {
		"equip_collections": UserIndex['Index']['equip_collections'],
		"chara_voice": UserIndex['Index']['chara_voice'],
		"auto_limit_break_flag": UserIndex['Index']['auto_limit_break_flag'],
		"recollection_tutorial_flag": UserIndex['Index']['recollection_tutorial_flag']
	}
	next();
});
Flare.post("/game_server/api/users/rays_data_order1", async (req, res, next) => {
	const UserIndex = ReadIndex(res.locals.SessionID);
	res.locals.ResponseBody['message'] = {
		"chapters_list": UserIndex['Index']['chapters_list'],
		"chara_custom_scenario_part_ickx": UserIndex['Index']['chara_custom_scenario_part_ickx'],
		"chara_customs_chara_list": UserIndex['Index']['chara_customs_chara_list'],
		"chara_customs_item_list": UserIndex['Index']['chara_customs_item_list'],
		"recollection_episodes_list": UserIndex['Index']['recollection_episodes_list'],
		"recollection_episodes_play": UserIndex['Index']['recollection_episodes_play'],
		"recollection_series_series_list": UserIndex['Index']['recollection_series_series_list'],
		"scenario_logs_chapters": UserIndex['Index']['scenario_logs_chapters'],
		"scenario_logs_episodes": UserIndex['Index']['scenario_logs_episodes'],
		"scenario_logs_rays2_episodes": UserIndex['Index']['scenario_logs_rays2_episodes'],
		"scenario_logs_rays2_scenario_play": UserIndex['Index']['scenario_logs_rays2_scenario_play'],
		"scenario_logs_sub_episodes": UserIndex['Index']['scenario_logs_sub_episodes'],
		"scenario_logs_sub_scenario_play": UserIndex['Index']['scenario_logs_sub_scenario_play'],
		"scenario_logs_top": UserIndex['Index']['scenario_logs_top'],
		"scenario_logs_scenario_play": UserIndex['Index']['scenario_logs_scenario_play']
	}
	next();
});
Flare.post("/game_server/api/users/rays_data_order2", async (req, res, next) => {
	const UserIndex = ReadIndex(res.locals.SessionID);
	res.locals.ResponseBody['message'] = {
		"battle_chara_stamps_stamp_list": UserIndex['Index']['battle_chara_stamps_stamp_list'],
		"bgms_list": UserIndex['Index']['bgms_list'],
		"bridges_index": UserIndex['Index']['bridges_index'],
		"charas_list": UserIndex['Index']['charas_list'],
		"galleries_illustration_list": UserIndex['Index']['galleries_illustration_list'],
		"magical_mirrors_list": UserIndex['Index']['magical_mirrors_list'],
		"fairys_dresses_list": UserIndex['Index']['fairys_dresses_list'],
		"home_illustrations_list": UserIndex['Index']['home_illustrations_list'],
		"parties_list": UserIndex['Index']['parties_list'],
		"profiles_info": UserIndex['Index']['profiles_info'],
		"rooms_top": UserIndex['Index']['rooms_top'],
		"rooms_interior_list": UserIndex['Index']['rooms_interior_list'],
		"rooms_poster_list": UserIndex['Index']['rooms_poster_list'],
		"rooms_trophy_list": UserIndex['Index']['rooms_trophy_list'],
		"users_status": UserIndex['Index']['users_status'],
		"weapons_list": UserIndex['Index']['weapons_list'],
		"weapons_mirrage_weapon_surface_list": UserIndex['Index']['weapons_mirrage_weapon_surface_list'],
		"recollection_series_chara_equip_list": UserIndex['Index']['recollection_series_chara_equip_list'],
		"user_log_data": UserIndex['Index']['user_log_data']
	}
	next();
});

function ResHeaders(DataLength) {
	const Headers = { 
		'content-type': 'application/json',
		'content-length': DataLength
	}
	return Headers;
}
async function FinalizeResponse(req, res, next) {
	const Serialized = JSON.stringify(res.locals.ResponseBody);
	res.set(ResHeaders(Serialized.length));
	res.end(Serialized);
}
Flare.use(FinalizeResponse);
