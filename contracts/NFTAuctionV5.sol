// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
// Initializable 就是“可升级合约的构造函数锁”，保证初始化函数只能被执行一次，防止被恶意重放。
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "hardhat/console.sol";

/**
 * 项目流程介绍  
 *  placeBid是从msg.sender转入token到合约：transferFrom(msg.sender, this);
 *  endAuction就是从合约转出token到seller：transferFrom(this, seller)；
 * @title 
 * @author 
 * @notice 
 */

contract NFTAuctionV5 is Initializable {

    struct Auction {
        address seller;
        uint256 duration;
        uint256 startPrice;
        uint256 startTime;
        bool ended;
        address highestBidder;
        uint256 highestBid;
        address nftContract;
        uint256 tokenId;
        // 参与竞价的资产类型 0x 地址表示eth，其他地址表示erc20
        // 0x0000000000000000000000000000000000000000 表示eth
        address tokenAddress;   
    }

    mapping(uint256 => Auction) public auctions;
    uint256 public nextAuctionId;
    // 管理员地址
    address public admin;
    
    mapping (address => AggregatorV3Interface) public priceFeeds;


    // 初始化函数，替代构造函数
    function initialize() public initializer {
        admin = msg.sender;
    }

    // 拍卖流程1： 创建拍卖
    function createAuction(
        address _nftContract,
        uint256 _tokenId,
        uint256 _duration,
        uint256 _startPrice
    ) public {
        // 每一个拍卖对应一个NFT，所以需要把NFT转移到拍卖合约中
        // TODO: approval 检查
        IERC721(_nftContract).transferFrom(
            msg.sender,
            address(this),
            _tokenId
        );
        auctions[nextAuctionId] = Auction({
            seller: msg.sender,
            duration: _duration,
            startPrice: _startPrice,
            startTime: block.timestamp,
            ended: false,
            highestBidder: address(0),
            highestBid: 0,
            nftContract: _nftContract,
            tokenId: _tokenId,
            tokenAddress: address(0)
        });
        nextAuctionId++;

        // console.log("createAuction...", );
    }

    // 拍卖流程2： 出价: 判断有效性，退还之前最高出价者，接受新出价
    // 必传参数 nft address, bid amount, 
    // 针对ERC721的选填参数： tokenAddresserc20;
    function placeBid(
        uint256 _auctionId,
        uint256 amount,
        address _tokenAddress
    ) external payable {
        Auction storage auction = auctions[_auctionId];
        require(
            block.timestamp <= auction.startTime + auction.duration,
            "Auction already ended"
        );
        require(amount >= auction.highestBid, "There already is a higher bid");

                // 兑换不同类型资产，校验价格
        uint256 payValue ;
        if (auction.tokenAddress == address(0)) {
            // 处理 ETH            
            payValue = amount * uint(getChainlinkDataFeedLatestAnswer(address(0)));
        }else{
            payValue = amount * uint(getChainlinkDataFeedLatestAnswer(_tokenAddress));
        }

        uint256 startPriceValue = auction.startPrice * 
            uint(getChainlinkDataFeedLatestAnswer(auction.tokenAddress));
        uint256 highestBidValue = auction.highestBid * 
            uint(getChainlinkDataFeedLatestAnswer(auction.tokenAddress)); 
        require(payValue >= startPriceValue && payValue > highestBidValue, "payValue is too low");

        // 如果之前有出价，退还之前最高出价者的资金
        if (auction.highestBidder != address(0)) {
             // 以太币退款
            if (auction.tokenAddress == address(0)) {               
                payable(auction.highestBidder).transfer(auction.highestBid);
            } else {
                // ERC20退款
                IERC20(auction.tokenAddress).transferFrom(
                    address(this),
                    auction.highestBidder,
                    auction.highestBid
                );
            }
        }

        // 接受新的出价
        if (_tokenAddress == address(0)) {
            // 以太币出价
            require(msg.value == amount, "Sent ether value does not match bid amount");
            // TODO ETH需要做什么接受吗？
        } else {
            // ERC20出价
            IERC20(_tokenAddress).transferFrom(
                msg.sender,
                address(this),
                amount
            );
            uint256 currentAmount = IERC20(_tokenAddress).balanceOf(address(this));
            console.log("placeBid currentAmount...", currentAmount);
        }

        // 记录到拍卖合约中
        auction.highestBidder = msg.sender;
        auction.highestBid = amount;
        // 更新参与交易的资产类型，默认为0--ETH
        auction.tokenAddress = _tokenAddress;
    }
    
    // 拍卖流程3：结束拍卖 : 转移NFT给最高出价者，转移资金给卖家
    function endAuction(uint256 _auctionId) external {
        Auction storage auction = auctions[_auctionId];
        require(msg.sender == auction.seller, "Only seller can end auction");
        require(
            !auction.ended &&
                auction.startTime + auction.duration <= block.timestamp,
            "Auction not yet ended"
        );
        // 转移NFT给最高出价者
        IERC721(auction.nftContract).safeTransferFrom(
            address(this),
            auction.highestBidder,
            auction.tokenId
        );

        // 转移资金给卖家
    //    console.log("转移资金给卖家...");
        if (auction.tokenAddress == address(0)) {   
            // 以太币支付
            // payable(auction.seller).transfer(auction.highestBid);
            (bool success, ) = payable(auction.seller).call{value: auction.highestBid}("");
            require(success, "Transfer failed");
        } else {
            // ERC20支付
            // IERC20(auction.tokenAddress).transferFrom(
            //     address(this),
            //     auction.seller,
            //     auction.highestBid
            // );

            IERC20(auction.tokenAddress).transfer(
                auction.seller,
                auction.highestBid
            );
        }
        auction.ended = true;
    }


    
    function setPriceFeed(
        address tokenAddress,
        address _priceFeed
    ) public {
        priceFeeds[tokenAddress] = AggregatorV3Interface(_priceFeed);
    }

    /**
     * Returns the latest answer.
    */
  function getChainlinkDataFeedLatestAnswer(address tokenAddress) public view returns (int256) {
    AggregatorV3Interface priceFeed = priceFeeds[tokenAddress];
    console.log("tokenAddress: ", tokenAddress);

    // prettier-ignore
    (
      /* uint80 roundId */
      ,
      int256 answer,
      /*uint256 startedAt*/
      ,
      /*uint256 updatedAt*/
      ,
      /*uint80 answeredInRound*/
    ) = priceFeed.latestRoundData();
    
    return answer;
  }


}
