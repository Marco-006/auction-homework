require("dotenv").config();   // 必须放在文件最开头
require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");   
require("@openzeppelin/hardhat-upgrades");
require("solidity-coverage");    

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",

  // namedAccounts: {
  //   deployer: {
  //     default: 0,
  //   },
  // },
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY]
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY, // 或直接写字符串 "YOUR_KEY"
      // 如果同时验证主网，再写 mainnet: process.env.ETHERSCAN_API_KEY
    }
  }
};

console.log("PK:", process.env.PRIVATE_KEY);
