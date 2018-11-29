import React, { Component } from 'react';
import './App.css';
import { Dapparatus, Gas, ContractLoader, Transactions, Events, Scaler, Blockie, Address, Button } from "dapparatus"
import Web3 from 'web3';

import axios from 'axios';
let FALLBACK_WEB3_PROVIDER = "http://0.0.0.0:8545"

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      web3: false,
      account: false,
      gwei: 4,
      doingTransaction: false,
    }
  }
  async poll(){
    if(this.state&&this.state.contracts){
      console.log("this.state.account",this.state.account)
      let metaCoinBalance = await this.state.contracts.MetaCoin.balanceOf(this.state.account).call()
      let isMinter = await this.state.contracts.MetaCoin.isMinter(this.state.account).call()
      if(metaCoinBalance!=this.state.metaCoinBalance||isMinter!=this.state.isMinter){
        this.setState({metaCoinBalance:metaCoinBalance,isMinter:isMinter})
      }
    }
  }
  handleInput(e){
    let update = {}
    update[e.target.name] = e.target.value
    this.setState(update)
  }
  render() {
    let {web3,account,contracts,tx,gwei,block,avgBlockTime,etherscan} = this.state
    let connectedDisplay = []
    let contractsDisplay = []
    if(web3){
      connectedDisplay.push(
       <Gas
         key="Gas"
         onUpdate={(state)=>{
           console.log("Gas price update:",state)
           this.setState(state,()=>{
             console.log("GWEI set:",this.state)
           })
         }}
       />
      )

      connectedDisplay.push(
        <ContractLoader
         key="ContractLoader"
         config={{DEBUG:true}}
         web3={web3}
         require={path => {return require(`${__dirname}/${path}`)}}
         onReady={(contracts,customLoader)=>{
           console.log("contracts loaded",contracts)
           this.setState({contracts:contracts},async ()=>{
             console.log("Contracts Are Ready:",this.state.contracts)
             setInterval(this.poll.bind(this),3000);this.poll()
           })
         }}
        />
      )
      connectedDisplay.push(
        <Transactions
          key="Transactions"
          config={{DEBUG:false}}
          account={account}
          gwei={gwei}
          web3={web3}
          block={block}
          avgBlockTime={avgBlockTime}
          etherscan={etherscan}
          onReady={(state)=>{
            console.log("Transactions component is ready:",state)
            this.setState(state)
          }}
          onReceipt={(transaction,receipt)=>{
            // this is one way to get the deployed contract address, but instead I'll switch
            //  to a more straight forward callback system above
            console.log("Transaction Receipt",transaction,receipt)
          }}
        />
      )

      if(contracts){

        let minterView = ""
        if(this.state.isMinter){
          minterView = (
            <div>
              Mint <input
                style={{verticalAlign:"middle",width:50,margin:6,maxHeight:20,padding:5,border:'2px solid #ccc',borderRadius:5}}
                type="text" name="mintAmount" value={this.state.mintAmount} onChange={this.handleInput.bind(this)}
              /> metacoins to <input
                  style={{verticalAlign:"middle",width:300,margin:6,maxHeight:20,padding:5,border:'2px solid #ccc',borderRadius:5}}
                  type="text" name="mintTo" value={this.state.mintTo} onChange={this.handleInput.bind(this)}
                />
              <Button size="2" color="green" onClick={async ()=>{
                tx(
                  contracts.MetaCoin.mint(this.state.mintTo,this.state.mintAmount),
                  (receipt)=>{
                    this.setState({mintTo:"",mintAmount:""})
                  }
                )
              }}>
                Mint
              </Button>
            </div>
          )
        }

        let balanceView = (
          <div>
            MetaCoin Balance: <span style={{color:"#FFFFFF"}}>{this.state.metaCoinBalance}</span>
          </div>
        )

        let transferView = (
          <div>
            Transfer <input
              style={{verticalAlign:"middle",width:50,margin:6,maxHeight:20,padding:5,border:'2px solid #ccc',borderRadius:5}}
              type="text" name="transferAmount" value={this.state.transferAmount} onChange={this.handleInput.bind(this)}
            /> metacoins to <input
                style={{verticalAlign:"middle",width:300,margin:6,maxHeight:20,padding:5,border:'2px solid #ccc',borderRadius:5}}
                type="text" name="transferTo" value={this.state.transferTo} onChange={this.handleInput.bind(this)}
              />
            <Button size="2" color="green"onClick={async ()=>{
              if(this.state.metaAccount||this.state.balance===0){
                console.log("This will be a custom meta transaction")
                const method = "metaTransfer"
                const reward = 0
                //get the nonce from the contract
                const nonce = await contracts.MetaCoin.replayNonce(this.state.account).call()
                console.log("nonce:",nonce)
                //address to, uint256 value, uint256 nonce, uint256 reward
                const args = [
                  this.state.transferTo,
                  web3.utils.toTwosComplement(this.state.transferAmount),
                  web3.utils.toTwosComplement(nonce),
                  web3.utils.toTwosComplement(reward)
                ]
                console.log("args:",args)
                //get the hash of the arguments from the contract
                const message = await contracts.MetaCoin[method+'Hash'](...args).call()
                console.log("message:",message)
                let sig
                //sign the hash using either the meta account OR the etherless account
                if(this.state.metaAccount.privateKey){
                  console.log(this.state.metaAccount.privateKey)
                  sig = web3.eth.accounts.sign(message, this.state.metaAccount.privateKey);
                  sig = sig.signature
                }else{
                  sig = await web3.eth.personal.sign(""+message,this.state.account)
                }
                console.log("sig:",sig)
                //package up the details of the POST
                let postData = {
                  gas: 100000,
                  message: message,
                  args:args,
                  sig:sig,
                  method:method,
                }
                console.log("postData:",postData)
                //post the data to the relayer
                axios.post('http://0.0.0.0:9999/tx', postData, {
                  headers: {
                      'Content-Type': 'application/json',
                  }
                }).then((response)=>{
                  console.log("TX RESULT",response.data)
                  let hash = response.data.transactionHash
                  console.log("adding custom tx with hash",hash)
                  //add the custom transaction to the <Transactions/> component
                  this.state.customtx(hash,(receipt)=>{
                    console.log("TX RECEIPT",receipt)
                  })
                })
                .catch((error)=>{
                  console.log(error);
                });
              }else{
                tx(
                  contracts.MetaCoin.transfer(this.state.transferTo,this.state.transferAmount),
                  (receipt)=>{
                    this.setState({transferTo:"",transferAmount:""})
                  }
                )
              }
            }}>
              Send
            </Button>
          </div>
        )

        contractsDisplay.push(
          <div key="UI" style={{padding:30}}>
            <div>
              MetaCoin: <Address
                {...this.state}
                address={contracts.MetaCoin._address}
              />
            </div>
            {minterView}
            {balanceView}
            {transferView}
            <Events
              config={{hide:false}}
              contract={contracts.MetaCoin}
              eventName={"Transfer"}
              block={block}
              onUpdate={(eventData,allEvents)=>{
                console.log("EVENT DATA:",eventData)
                this.setState({events:allEvents})
              }}
            />
          </div>
        )
      }

    }
    return (
      <div className="App">
        <Dapparatus
          config={{requiredNetwork:['Unknown','Rinkeby']}}
          fallbackWeb3Provider={new Web3.providers.HttpProvider(FALLBACK_WEB3_PROVIDER)}
          onUpdate={(state)=>{
           console.log("metamask state update:",state)
           if(state.web3Provider) {
             state.web3 = new Web3(state.web3Provider)
             this.setState(state)
           }
          }}
        />
        {connectedDisplay}
        {contractsDisplay}
      </div>
    );
  }
}

export default App;
