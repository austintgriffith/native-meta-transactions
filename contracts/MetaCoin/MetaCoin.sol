pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";

contract MetaCoin is ERC20Mintable {

  string public name = "MetaCoin";
  string public symbol = "MC";
  uint8 public decimals = 0;

  constructor() public {

  }

  mapping (address => uint256) public replayNonce;

  function metaTransfer(bytes signature, address to, uint256 value, uint256 nonce, uint256 reward) public returns (bool) {
    bytes32 metaHash = metaTransferHash(to,value,nonce,reward);
    address signer = getSigner(metaHash,signature);
    require(nonce == replayNonce[signer]);
    replayNonce[signer]++;
    _transfer(signer, to, value);
    if(reward>0){
      _transfer(signer, msg.sender, reward);
    }
  }
  function metaTransferHash(address to, uint256 value, uint256 nonce, uint256 reward) public view returns(bytes32){
    return keccak256(abi.encodePacked(address(this),"metaTransfer", to, value, nonce, reward));
  }

  /*
  function metaApprove(address spender, uint256 value, uint256 nonce, uint256 reward, bytes signature) public returns (bool) {
    require(spender != address(0));
    bytes32 metaHash = metaApproveHash(spender,value,nonce,reward);
    address signer = getSigner(metaHash,signature);
    require(nonce == replayNonce[signer]);
    replayNonce[signer]++;
    _allowed[signer][spender] = value;
    if(reward>0){
      _transfer(signer, msg.sender, reward);
    }
    emit Approval(msg.sender, spender, value);
    return true;
  }
  function metaApproveHash(address spender, uint256 value, uint256 nonce, uint256 reward) public view returns(bytes32){
    return keccak256(abi.encodePacked(address(this),"metaApprove" spender, value, nonce, reward));
  }
  */

  function getSigner(bytes32 _hash, bytes _signature) internal pure returns (address){
    bytes32 r;
    bytes32 s;
    uint8 v;
    if (_signature.length != 65) {
      return address(0);
    }
    assembly {
      r := mload(add(_signature, 32))
      s := mload(add(_signature, 64))
      v := byte(0, mload(add(_signature, 96)))
    }
    if (v < 27) {
      v += 27;
    }
    if (v != 27 && v != 28) {
      return address(0);
    } else {
      return ecrecover(keccak256(
        abi.encodePacked("\x19Ethereum Signed Message:\n32", _hash)
      ), v, r, s);
    }
  }

}
