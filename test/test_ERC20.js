const {ethers, deployments} = require("hardhat")
const { expect } = require("chai");


describe("End-to-End Test for NftAuctionV5", function () {
    // it("ETH Test start...", async function () {
    //     const [owner, bidder1, bidder2] = await ethers.getSigners();

    //     // 部署ERC721测试合约部署
    //     // await deployments.fixture(["erc721"]);
    //     const ERC721V5 = await ethers.getContractFactory("ERC721V5");
    //     const ERC721V5Instance = await ERC721V5.deploy();
    //     ERC721V5Instance.waitForDeployment();
    //     const erc721Address = await ERC721V5Instance.getAddress();
    //     console.log("ERC721V5 deployed at:", erc721Address);

    //     // 挖矿铸造NFT
    //     for (let index = 0; index < 10; index++) {
    //         ERC721V5Instance.mint(owner.address, index);            
    //     }
    //     console.log("Minted 10 NFTs to owner:", owner.address);


    //     // 部署NFTAuctionV5合约 将ERC721合约地址传入
    //     // await deployments.fixture(["NFTAuctionV5"]);
    //     await deployments.fixture(["NFTAuctionV5"]);
    //     const NFTAuctionV5Proxy = await deployments.get("NFTAuctionV5Proxy");


    //     // console.log("NFTAuctionV5Proxy :", NFTAuctionV5Proxy);
    //     const nftAuctionV5Instance = await ethers.getContractAt("NFTAuctionV5", NFTAuctionV5Proxy.address);
    //     console.log("NFTAuctionV5Proxy deployed at:", NFTAuctionV5Proxy.address);

    //     await ERC721V5Instance.connect(owner).setApprovalForAll(NFTAuctionV5Proxy.address, true);
    //     // 创建拍卖
    //     const createAuctionTx = await nftAuctionV5Instance.connect(owner).createAuction(
    //         erc721Address,
    //         1, // tokenId
    //         10, // duration in seconds
    //         ethers.parseEther("1"), // startingBid
    //     );
    //     await createAuctionTx.wait();

    //     const auction0 = await nftAuctionV5Instance.auctions(0);

    //     // 出价
    //     // ETH参与竞价
    //     const bidTx1 = await nftAuctionV5Instance.connect(bidder1).placeBid(0, ethers.parseEther("1.5"), ethers.ZeroAddress, { value: ethers.parseEther("1.5") });
    //     await bidTx1.wait();

    //     // 结束拍卖
    //     await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
    //     await nftAuctionV5Instance.connect(owner).endAuction(0);

    //     // 验证拍卖结果
    //     const auction = await nftAuctionV5Instance.auctions(0);
    //     expect(auction.ended).to.be.true;
    //     expect(auction.highestBid).to.equal(ethers.parseEther("1.5"));
    //     console.log("ETH Test end...");
    // });


    it("ERC20 Test start...", async function () {
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
        // await deployments.fixture(["NFTAuctionV5"]);
        await deployments.fixture(["NFTAuctionV5"]);
        const NFTAuctionV5Proxy = await deployments.get("NFTAuctionV5Proxy");


        // console.log("NFTAuctionV5Proxy :", NFTAuctionV5Proxy);
        const nftAuctionV5Instance = await ethers.getContractAt("NFTAuctionV5", NFTAuctionV5Proxy.address);
        console.log("NFTAuctionV5Proxy deployed at:", NFTAuctionV5Proxy.address);

        // 给代理合约授权  approval for all
        await ERC721V5Instance.connect(owner).setApprovalForAll(NFTAuctionV5Proxy.address, true);
        // 创建拍卖
        const createAuctionTx = await nftAuctionV5Instance.connect(owner).createAuction(
            erc721Address,
            1, // tokenId
            10, // duration in seconds
            ethers.parseEther("1"), // startingBid
        );
        await createAuctionTx.wait();
        console.log("Auction created for tokenId 1");


        const auction0 = await nftAuctionV5Instance.auctions(0);
        // console.log("Auction 0 details:", auction0);

        // 出价
        // ERC720 拍卖出价
        const TestERC20 = await ethers.getContractFactory("TestERC20");
        const testERC20 = await TestERC20.deploy();
        await testERC20.waitForDeployment();
        const UsdcAddress = await testERC20.getAddress();
        console.log("TestERC20 deployed at:", UsdcAddress);        
        let tx = await testERC20.connect(owner).transfer(bidder1, ethers.parseEther("1"))
        await tx.wait()

        // price feed
        const aggreagatorV3 = await ethers.getContractFactory("AggregatorV3");
        const priceFeedEthDeploy = await aggreagatorV3.deploy(ethers.parseEther("10000"));
        const priceFeedEth = await priceFeedEthDeploy.waitForDeployment();
        const priceFeedEthAddress = await priceFeedEth.getAddress();
        console.log("priceFeedEthAddress...", priceFeedEthAddress);

        const priceFeedUsdcDeploy = await aggreagatorV3.deploy(ethers.parseEther("1"));
        const priceFeedUsdc = await priceFeedUsdcDeploy.waitForDeployment();
        const priceFeedUsdcAddress = await priceFeedUsdc.getAddress();
        console.log("priceFeedUsdcAddress...", priceFeedUsdcAddress);

        const token2Usd = [
            {
                token: ethers.ZeroAddress,
                usdAddress: priceFeedEthAddress
            },
            {
                token: UsdcAddress,
                usdAddress: priceFeedEthAddress
            }
        ]

        for (let index = 0; index < token2Usd.length; index++) {
            const { token, usdAddress }  = token2Usd[index];
            await nftAuctionV5Instance.setPriceFeed(token, usdAddress);
        } 
        

        // USDC参与竞价
        tx = await testERC20.connect(bidder1).approve(NFTAuctionV5Proxy.address, ethers.MaxUint256)

        console.log("approve to ....", NFTAuctionV5Proxy.address);
        await tx.wait()

        const allowance = await testERC20.allowance(bidder1.address, NFTAuctionV5Proxy.address);
        console.log("allowance...", allowance.toString());

        tx = await nftAuctionV5Instance.connect(bidder1).placeBid(0, ethers.parseEther("1"), UsdcAddress);
        await tx.wait()
        console.log("bidder1.address...",bidder1.address);

        // 结束拍卖
        await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
        await nftAuctionV5Instance.connect(owner).endAuction(0);

        // 验证拍卖结果
        const auction = await nftAuctionV5Instance.auctions(0);
        console.log("auction.ended: ", auction.ended);
        expect(auction.ended).to.be.true;
        expect(auction.highestBid).to.equal(ethers.parseEther("1"));
        console.log("Auction ended successfully with highest bid:", ethers.formatEther(auction.highestBid));
    })
});