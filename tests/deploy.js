const clevis = require("./clevis.js")
for(let c in clevis.contracts){
  clevis.deploy(clevis.contracts[c],0)
}
clevis.addMinter(0,"0x2a906694d15df38f59e76ed3a5735f8aabcce9cb")
