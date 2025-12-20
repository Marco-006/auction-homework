const { ethers, upgrades} = require("hardhat");
const fs = require("fs");
const path = require("path");


module.exports = async () => {
    const {save, get} = deployments;
    const [deployer] = await ethers.getSigners();
    console.log("Upgrading contracts with the account:", deployer.address);

    const NFTAuctionV5 = await ethers.getContractFactory("NFTAuctionV5");

    // 读取之前部署的代理合约地址
    const storePath = path.resolve(__dirname, '../cache/proxyAuction.json');
    const proxyData = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    const proxyAddress = proxyData.address;
    console.log("代理合约地址:", proxyAddress);
    const implAddress0 = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log("当前实现合约地址 (升级前) ：", implAddress0);

    // 通过代理合约地址升级可升级合约
    const NFTAuctionV5Proxy = await upgrades.upgradeProxy(proxyAddress, NFTAuctionV5);
    await NFTAuctionV5Proxy.waitForDeployment();
    const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log("新的实现合约地址：", implAddress);
    const newProxyAddress = await NFTAuctionV5Proxy.getAddress();
    console.log("代理合约地址（升级后）:", newProxyAddress);

    // 更新部署信息，方便后续使用 hardhat-deploy 插件进行管理
    // fs.writeFileSync(
    //     storePath,
    //     JSON.stringify({
    //         address: proxyAddress,
    //         implementationAddress: implAddress,
    //         abi: NFTAuctionV5Proxy.interface.format('json'),
    //     }, null, 2)
    // );

    await save('NFTAuctionV5Proxy', {
        address: proxyAddress,
        abi: NFTAuctionV5Proxy.interface.format('json'),
    });
}