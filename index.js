import Web3 from 'web3';
import { Biconomy } from '@biconomy/mexa';
import {
    helperAttributes,
    getDomainSeperator,
    getDataToSignForPersonalSign,
    getDataToSignForEIP712,
    buildForwardTxRequest,
    getBiconomyForwarderConfig
} from './biconomyForwardHelpers.js';

let contractAddress = "0x6d9a4053aa960b59b4b196830422e5539fadd0f5";
const app_id = "b706f0fa-a1ca-40c5-a620-5bb821a56aa6";
const api_key = "HziWYKHVP.429840c1-257c-4d41-aa7d-329202d56f63";
let mintContractAddress = "0xfb172cA34CD781d3CB057f29fA4f640773C8e9aE";

let abi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_forwarder",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "payload",
        "type": "bytes"
      },
      {
        "internalType": "address",
        "name": "_contractAddress",
        "type": "address"
      }
    ],
    "name": "executeMint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_contractAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "executeMintForNeo",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTrustedForwarder",
    "outputs": [
      {
        "internalType": "address",
        "name": "forwarder",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "forwarder",
        "type": "address"
      }
    ],
    "name": "isTrustedForwarder",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
];

const startBtn = document.getElementById('click');
startBtn.addEventListener('click', async () => {
    console.log("hehllo");
    start();
})

const start = async () => {
    if(!window.ethereum) {
      console.log("No Metamask");
    }
    await window.ethereum.enable();
    let walletWeb3 = new Web3(window.ethereum);
    accounts = await walletWeb3.eth.getAccounts();
    console.log(accounts[0]);

    let userAddress =  accounts[0];
    let networkId = await walletWeb3.eth.net.getId();

    const contract = new walletWeb3.eth.Contract(
        abi,
        contractAddress
    );

    let functionSignature = contract.methods
                .executeMintForNeo(mintContractAddress, 1)
                .encodeABI();

    console.log(functionSignature)

    let txGas = await walletWeb3.eth.estimateGas({
        from: accounts[0], 
        data: functionSignature,
        to: contractAddress
    });              
    let forwarder = await getBiconomyForwarderConfig(networkId);
    console.log(forwarder);
    let forwarderContract = new walletWeb3.eth.Contract(
        forwarder.abi,
        forwarder.address
    );

    const batchNonce = await forwarderContract.methods.getNonce(accounts[0],0).call();
    const gasLimitNum = Number(txGas);
    const to = contractAddress;
    const batchId = 0;

    const txValue = await walletWeb3.utils.toWei('1', 'ether');
    const request = await buildForwardTxRequest({account:userAddress,to,gasLimitNum,batchId,batchNonce,data:functionSignature});
    console.log(request)

    const network = await walletWeb3.eth.net.getId();
    console.log(network);
    const domainSeparator = await getDomainSeperator(network);
    console.log(domainSeparator);
    const dataToSign =  await getDataToSignForEIP712(request,networkId);
   
    walletWeb3.currentProvider.send({
            jsonrpc: "2.0",
            id: 999999999999,
            method: "eth_signTypedData_v4",
            params: [userAddress, dataToSign]
        },
        function (error, response) {
            console.info(`User signature is ${response.result}`);
            if (error || (response && response.error)) {
                //showErrorMessage("Could not get user signature");
                console.log(error);
                console.log(response);
            } else if (response && response.result) {
                let sig = response.result;
                console.log(sig);
                //sendTransaction({userAddress, request, domainSeparator, sig, signatureType:biconomy.EIP712_SIGN});
                const params = [request, domainSeparator, sig];
                fetch(`https://api.biconomy.io/api/v2/meta-tx/native`, {
                  method: "POST",
                  headers: {
                      "x-api-key": api_key,
                      "Content-Type": "application/json;charset=utf-8",
                },
                  body: JSON.stringify({
                      to: "0x6d9a4053aa960b59b4b196830422e5539fadd0f5",
                      apiId: app_id,
                      params: params,
                      from: userAddress,
                      signatureType: "EIP712_SIGN"
                }),
                })
                .then((response) => response.json())
                .then(async function (result) {
                    console.log(result);
                })
                .catch(function (error) {
                    console.log(error);
                });
            }
        }
    );

    
}
