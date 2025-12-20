// require("hardhat-deploy");
const { ethers, upgrades} = require("hardhat");
const fs = require("fs");
const path = require("path");


module.exports = async () => {
    const {save} = deployments;
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const NFTAuctionV5 = await ethers.getContractFactory("NFTAuctionV5");

    // 通过代理合约部署可升级合约
    const NFTAuctionV5Proxy = await upgrades.deployProxy(NFTAuctionV5, [], {
        initializer: 'initialize',
      });

    await NFTAuctionV5Proxy.waitForDeployment();  

    const proxyAddress = await NFTAuctionV5Proxy.getAddress();
    console.log("代理合约地址:", proxyAddress);
    const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress)
    console.log("实现合约地址：", implAddress);  
    
    // 保存部署信息，方便后续使用 hardhat-deploy 插件进行管理
    const storePath = path.resolve(__dirname, '../cache/proxyAuction.json');

    fs.writeFileSync(
        storePath,
        JSON.stringify({
            address: proxyAddress,
            implementationAddress: implAddress,
            abi: NFTAuctionV5Proxy.interface.format('json'),
        }, null, 2)
    );

    await save('NFTAuctionV5Proxy', {
        address: proxyAddress,
        abi: NFTAuctionV5Proxy.interface.format('json'),
    });
}

// module.exports = deployNftAuctionV5;
module.exports.tags = ['NFTAuctionV5'];
