const fs = require('fs');
const Old = JSON.parse(fs.readFileSync('./AssetList_v7_iOS.json'));
const OldEx = JSON.parse(fs.readFileSync('./Expansion_v7_iOS.json'));
const New = JSON.parse(fs.readFileSync('./AssetList_v8_iOS.json'));
const NewEx = JSON.parse(fs.readFileSync('./Expansion_v8_iOS.json'));

let UpdatedList = [];

const OldList = Old['AssetBundleNames']['Array'];
const OldHash = Old['AssetBundleInfos']['Array'];
const NewList = New['AssetBundleNames']['Array'];
const NewHash = New['AssetBundleInfos']['Array'];
for (const x in NewList) {
	const ID = NewList[x]['first'];
	const Name = NewList[x]['second'];
	const CurrentHash = JSON.stringify(NewHash.find(y => y.first == ID)['second']['AssetBundleHash']);
	
	const OldFile = OldList.findIndex(y => y.second == Name);
	if (OldFile == -1) { UpdatedList.push(Name); continue; }
	const OldID = OldList[OldFile]['first'];
	const PreviousHash = JSON.stringify(OldHash.find(y => y.first == OldID)['second']['AssetBundleHash']);
	
	if (CurrentHash != PreviousHash) { UpdatedList.push(Name); }
}

const NewExKeys = Object.keys(NewEx);
for (const x in NewExKeys) {
	if (OldEx[NewExKeys[x]] == undefined) { UpdatedList.push(NewExKeys[x]); continue; }
	const CurrentHash = NewEx[NewExKeys[x]]['hash'];
	const PreviousHash = OldEx[NewExKeys[x]]['hash'];
	if (CurrentHash != PreviousHash) { UpdatedList.push(NewExKeys[x]); }
}

fs.writeFileSync('./Updated.json', JSON.stringify(UpdatedList, null, 2));