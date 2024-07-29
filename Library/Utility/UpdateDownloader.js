const fs = require('fs');
const stream = require('stream');
const child_process = require('child_process');
const List = JSON.parse(fs.readFileSync('./Updated.json'));
let Failed = [];
async function Download(URL, AssetName, Directory) {
        const DownResp = await fetch(URL);
        if (DownResp.ok && DownResp.body) {
                console.log("Downloading " + AssetName);
                const NameSplit = AssetName.split("/");
                let OutPath = "";
                let d = 0; while (d < NameSplit.length - 1) {
                        OutPath += NameSplit[d] + "/";
                        d++;
                }
                child_process.execSync('mkdir -p ./' + Directory + OutPath, {stdio: 'inherit'});
                let Output = fs.createWriteStream(Directory + AssetName);
                stream.Readable.fromWeb(DownResp.body).pipe(Output);
        }
        else { console.log("Failed to download " + AssetName); Failed.push(AssetName); }
		Concurrent -= 1;
}

const URLBase = "https://cdn-production-cf.toco.tales-ch.jp/public/6003000/7-YWVhZGI3Mjk1NzdlOGNjNjg2ODIwYjRmOWU5YTdkZGE4OGFmNzQ2YzRmNDJjNTQ1M2ViYmMyZGVkNjQxYWM3Nw/AssetBundlesFolder/";
let Concurrent = 0;
async function Main() {
		const Directory = "iOSHigh/"
        for (const x in List) {
                const URL = URLBase + Directory + List[x];
				while (Concurrent > 5) {
					await new Promise(resolve => setTimeout(resolve, 1000));
				}
				Concurrent += 1;
				Download(URL, List[x], Directory);
        }
        fs.writeFileSync('./Failed.json', JSON.stringify(Failed));
}
Main();