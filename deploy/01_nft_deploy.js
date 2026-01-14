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
    const NFTAuctionV5Proxy = await upgrades.deployProxy(NFTAuctionV5, [deployer.address], {
        initializer: 'initialize',
      });

    await NFTAuctionV5Proxy.waitForDeployment();  

    const proxyAddress = await NFTAuctionV5Proxy.getAddress();
    console.log("代理合约地址:", proxyAddress);
    const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress)
    console.log("实现合约地址：", implAddress);  
    
    // 保存部署信息，方便后续使用 hardhat-deploy 插件进行管理
    const storePath = path.resolve(__dirname, '../cache/proxyAuction.json');

    // 把“代理地址 + 实现地址 + 合约 ABI”一起写进这个文件，方便前端或其他脚本读取
    fs.writeFileSync(
        storePath,
        JSON.stringify({
            address: proxyAddress,
            implementationAddress: implAddress,
            abi: NFTAuctionV5Proxy.interface.format('json'),
        }, null, 2)
    );

    // hardhat-deploy 的 save 方法，把部署结果写进 deployments/xx.json 
    // 这样以后可以用 deployments.get("NftAuctionProxy") 直接拿到地址和 ABI
    await save('NFTAuctionV5Proxy', {
        address: proxyAddress,
        abi: NFTAuctionV5Proxy.interface.format('json'),
    });
}

// module.exports = deployNftAuctionV5;
module.exports.tags = ['NFTAuctionV5'];
