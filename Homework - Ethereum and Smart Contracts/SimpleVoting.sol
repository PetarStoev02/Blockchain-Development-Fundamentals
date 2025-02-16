// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

error InvalidCandidate();

contract SimpleVoting {
    address public candidate1 = 0x617F2E2fD72FD9D5503197092aC168c91465E7f2;
    address public candidate2;
    int256 public votesCand1;
    int256 public votesCand2;
    bool public voteOver;
    address public  winner;
    address public owner = 0x5B38Da6a701c568545dCfcB03FcB875f56beddC4;


    function vote(address candidate) external {

        require(!voteOver, "No more vote");

        if(candidate == candidate1) {
            votesCand1+=1;
        } else if(candidate == candidate2) {
            votesCand2+=1;
        } else {
            revert InvalidCandidate();
        }
    }

    function closeVote() external {
        require(msg.sender == owner, "Invalid request");

        voteOver = true;

        if(votesCand1 > votesCand2) {
            winner = candidate1;
        } else {
            winner = candidate2;
        }
    }
}