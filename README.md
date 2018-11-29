integrate signed message recovery directly in your contracts

---

Most of the meta transaction demos I have built to date revolve around creating a gasless layer on top of existing contracts. To do this there are a few trade offs including extra work on the frontend to track down the real msg.sender. A good example of this is in my EtherJamJam build.

I think it's important to highlight that if you are able to deploy fresh contracts you should probably be building meta transactions directly in your contracts. For instance, if you create a token, you can provide an interface and relay for your users to send their tokens without paying gas. 

---

Let's build an ERC20 token that gives etherless accounts the ability to transfer() and we'll build a relay that pays the gas.
