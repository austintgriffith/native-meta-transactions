"use strict";
const express = require('express');
const helmet = require('helmet');
const app = express();
const fs = require('fs');
const ContractLoader = function(contractList,web3){
  let contracts = []
  for(let c in contractList){
    try{
      let abi = require("./src/contracts/"+contractList[c]+".abi.js")
      let address = require("./src/contracts/"+contractList[c]+".address.js")
      console.log(contractList[c],address,abi.length)
      contracts[contractList[c]] = new web3.eth.Contract(abi,address)
      console.log("contract")
      contracts[contractList[c]].blockNumber = require("./src/contracts/"+contractList[c]+".blocknumber.js")
      console.log("@ Block",contracts[contractList[c]].blockNumber)
    }catch(e){console.log(e)}
  }
  return contracts
}

var bodyParser = require('body-parser')
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(helmet());
var cors = require('cors')
app.use(cors())
let contracts;
var Web3 = require('web3');
var web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://0.0.0.0:8545'));

let transactions = {}

const DESKTOPMINERACCOUNT = 3 //index in geth

let accounts
web3.eth.getAccounts().then((_accounts)=>{
  accounts=_accounts
  console.log("ACCOUNTS",accounts)
})

console.log("LOADING CONTRACTS")
contracts = ContractLoader(["MetaCoin"],web3);

app.get('/', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  console.log("/")
  res.set('Content-Type', 'application/json');
  res.end(JSON.stringify({hello:"world"}));

});

app.get('/miner', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  console.log("/miner")
  res.set('Content-Type', 'application/json');
  res.end(JSON.stringify({address:accounts[DESKTOPMINERACCOUNT]}));
});

app.get('/txs/:account', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  console.log("/txs/"+req.params.account)
  let thisTxsKey = req.params.account.toLowerCase()
  console.log("Getting Transactions for ",thisTxsKey)
  let allTxs = transactions[thisTxsKey]
  let recentTxns = []
  for(let a in allTxs){
    let age = Date.now() - allTxs[a].time
    if(age<120000){
      recentTxns.push(allTxs[a])
    }
  }
  res.set('Content-Type', 'application/json');
  res.end(JSON.stringify(allTxs));
});

//let whitelist = []
//whitelist.push("0xe68b423e49e13c704d2e403014a9c90d7961b98c".toLowerCase())

app.post('/tx', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  console.log("/tx",req.body)
  console.log("RECOVER:",req.body.message,req.body.sig)
  let account = web3.eth.accounts.recover(req.body.message,req.body.sig).toLowerCase()
  console.log("RECOVERED:",account)
  //if(whitelist.indexOf(account)>=0){
    console.log("Correct sig (whitelisted) ... relay transaction to contract... might want more filtering here, but just blindly do it for now")
    console.log("Forwarding tx to ",contracts.MetaCoin._address," with local account ",accounts[DESKTOPMINERACCOUNT])
    let txparams = {
      from: accounts[DESKTOPMINERACCOUNT],
      gas: req.body.gas,
      gasPrice:Math.round(4 * 1000000000)
    }
    console.log("calling method",req.body.method,"on contract",contracts.MetaCoin._address)
    //let hash = await contracts.MetaCoin[req.body.method+"Hash"](...req.body.parts).call()
    //console.log("hash (message):",hash)
    //const result = await clevis("contract","forward","BouncerProxy",accountIndexSender,sig,accounts[accountIndexSigner],localContractAddress("Example"),"0",data,rewardAddress,reqardAmount)
    console.log("TX",req.body.sig,...req.body.args)
    console.log("PARAMS",txparams)
    contracts.MetaCoin.methods[""+req.body.method](req.body.sig,...req.body.args).send(
      txparams ,(error, transactionHash)=>{
        console.log("TX CALLBACK",error,transactionHash)
        res.set('Content-Type', 'application/json');
        res.end(JSON.stringify({transactionHash:transactionHash}));
        let fromAddress = account
        if(!transactions[fromAddress]){
          transactions[fromAddress] = []
        }
        if(transactions[fromAddress].indexOf(transactions)<0){
          transactions[fromAddress].push({hash:transactionHash,time:Date.now(),metatx:true,miner:accounts[DESKTOPMINERACCOUNT]})
        }
      }
    )
    .on('error',(err,receiptMaybe)=>{
      console.log("TX ERROR",err,receiptMaybe)
    })
    .on('transactionHash',(transactionHash)=>{
      console.log("TX HASH",transactionHash)
    })
    .on('receipt',(receipt)=>{
      console.log("TX RECEIPT",receipt)
    })
    .then((receipt)=>{
      console.log("TX THEN",receipt)
    })


  //}
});

app.listen(9999);
console.log(`http listening on 9999`);
