import React, { Component } from 'react';
import './App.css';
import { Metamask, Gas, ContractLoader, Transactions, Events, Scaler, Blockie, Address, Button } from "dapparatus"
import Web3 from 'web3';

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
              tx(
                contracts.MetaCoin.transfer(this.state.transferTo,this.state.transferAmount),
                (receipt)=>{
                  this.setState({transferTo:"",transferAmount:""})
                }
              )
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
              eventName={"metaTransfer"}
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
        <Metamask
          config={{requiredNetwork:['Unknown','Rinkeby']}}
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
