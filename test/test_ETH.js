const {ethers, deployments} = require("hardhat")
const { expect } = require("chai");


describe("End-to-End Test for NftAuctionV5", function () {
    it("ETH Test start...", async function () {
        const [owner, bidder1, bidder2] = await ethers.getSigners();

        // 部署ERC721测试合约部署
        // await deployments.fixture(["erc721"]);
        const ERC721V5 = await ethers.getContractFactory("ERC721V5");
        const ERC721V5Instance = await ERC721V5.deploy();
        ERC721V5Instance.waitForDeployment();
        const erc721Address = await ERC721V5Instance.getAddress();
        console.log("ERC721V5 deployed at:", erc721Address);

        // 挖矿铸造NFT
        for (let index = 0; index < 10; index++) {
            ERC721V5Instance.mint(owner.address, index);            
        }
        console.log("Minted 10 NFTs to owner:", owner.address);


        // 部署NFTAuctionV5合约 将ERC721合约地址传入
        // deployments.fixture会把 Hardhat 本地网络回滚到最近一次“快照”，然后重新执行标签为 deployNftAuction 的那一组部署脚本
        await deployments.fixture(["NFTAuctionV5"]);
        const NFTAuctionV5Proxy = await deployments.get("NFTAuctionV5Proxy");


        // console.log("NFTAuctionV5Proxy :", NFTAuctionV5Proxy);
        const nftAuctionV5Instance = await ethers.getContractAt("NFTAuctionV5", NFTAuctionV5Proxy.address);
        console.log("NFTAuctionV5Proxy deployed at:", NFTAuctionV5Proxy.address);

        await ERC721V5Instance.connect(owner).setApprovalForAll(NFTAuctionV5Proxy.address, true);
        // 创建拍卖
        const createAuctionTx = await nftAuctionV5Instance.connect(owner).createAuction(
            erc721Address,
            1, // tokenId
            10, // duration in seconds
            ethers.parseEther("1"), // startingBid
        );
        await createAuctionTx.wait();

         // price feed
         const aggreagatorV3 = await ethers.getContractFactory("AggregatorV3");
         const priceFeedEthDeploy = await aggreagatorV3.deploy(ethers.parseEther("10000"));
         const priceFeedEth = await priceFeedEthDeploy.waitForDeployment();
         const priceFeedEthAddress = await priceFeedEth.getAddress();
         console.log("priceFeedEthAddress...", priceFeedEthAddress);
 
   
 
         const token2Usd = [
             {
                 token: ethers.ZeroAddress,
                 usdAddress: priceFeedEthAddress
             },
            //  {
            //      token: UsdcAddress,
            //      usdAddress: priceFeedEthAddress
            //  }
         ]
 
         for (let index = 0; index < token2Usd.length; index++) {
             const { token, usdAddress }  = token2Usd[index];
             await nftAuctionV5Instance.setPriceFeed(token, usdAddress);
         } 
        // 出价
        // ETH参与竞价
        const bidTx1 = await nftAuctionV5Instance.connect(bidder1).placeBid(0, ethers.parseEther("1.5"), ethers.ZeroAddress, { value: ethers.parseEther("1.5") });
        await bidTx1.wait();

        // 结束拍卖
        await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
        await nftAuctionV5Instance.connect(owner).endAuction(0);

        // 验证拍卖结果
        const auction = await nftAuctionV5Instance.auctions(0);
        expect(auction.ended).to.be.true;
        expect(auction.highestBid).to.equal(ethers.parseEther("1.5"));
        console.log("ETH Test end...");
    });
});