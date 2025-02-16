const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  const { expect } = require("chai");


  describe("VotingSystem", function() {
    const PROPOSAL_DESCRIPTION = "Desc";
    const VOTING_DURATION = 3600;


    async function deployVotingSystemFixture() {
        const [owner] = await ethers.getSigners();

        const VotingSystemFactory = await ethers.getContractFactory("VotingSystem");
        const votingSystemContract = await VotingSystemFactory.deploy();

        return {owner, votingSystemContract}
    }

    describe("Deploy", function() {
        it("Should test if contract owner is set correctly", async function() {
            const {owner, votingSystemContract} = await loadFixture(deployVotingSystemFixture);

            expect(await votingSystemContract.owner()).to.be.equal(owner.address);
        });


        it("Should test if initial proposal is correct", async function() {
            const {votingSystemContract} = await loadFixture(deployVotingSystemFixture);

            expect(await votingSystemContract.proposalCount()).to.be.equal(0);
        });
    })


    describe("Proposal", function() {
        it("Should check if proposal reverts when not owner", async function() {
            const { votingSystemContract} = await loadFixture(deployVotingSystemFixture);
            const [, user] = await ethers.getSigners();
            await expect(
                votingSystemContract.connect(user).createProposal(PROPOSAL_DESCRIPTION, VOTING_DURATION))
                .to.be
                .revertedWithCustomError(votingSystemContract, "NotOwner");
        });

        it("Should check if proposal reverts when votingPeriod is 0", async function() {
            const { votingSystemContract} = await loadFixture(deployVotingSystemFixture);
            await expect(
                votingSystemContract.createProposal(PROPOSAL_DESCRIPTION, 0))
                .to.be
                .revertedWithCustomError(votingSystemContract, "InvalidVotingPeriod");
        });

        it("Should check if proposalCount is incremented successfully", async function() {
            const { votingSystemContract} = await loadFixture(deployVotingSystemFixture);
            await votingSystemContract.createProposal(PROPOSAL_DESCRIPTION, VOTING_DURATION);

            expect( await votingSystemContract.proposalCount()).to.be.equal(1);

        });

        it("Should check if proposal is set correctly when created", async function() {
            const { votingSystemContract} = await loadFixture(deployVotingSystemFixture);
            await votingSystemContract.createProposal(PROPOSAL_DESCRIPTION, VOTING_DURATION);

            const proposal = await votingSystemContract.proposals(0);
            expect(proposal.description).to.equal(PROPOSAL_DESCRIPTION);
            expect(proposal.voteCount).to.equal(0);
            expect(proposal.endTime).to.be.above((await ethers.provider.getBlock("latest")).timestamp);
            expect(proposal.executed).to.be.false;

        });

        it("Should check if event emited by proposal", async function() {
            const { votingSystemContract} = await loadFixture(deployVotingSystemFixture);

            await expect(votingSystemContract.createProposal(PROPOSAL_DESCRIPTION, VOTING_DURATION))
                .to.emit(votingSystemContract, "ProposalCreated");

        });
    })

    describe("Voting Mechanism", function() {
        it("Should check if voting reverts when invalid proposal Id", async function() {
            const {votingSystemContract} = await loadFixture(deployVotingSystemFixture);

            await expect(votingSystemContract.vote(1))
                .to.be
                .revertedWithCustomError(votingSystemContract, "InvalidProposal");
        });


        it("Should check if voting reverts when already voted for proposal", async function() {
            const {votingSystemContract} = await loadFixture(deployVotingSystemFixture);
            await votingSystemContract.createProposal(PROPOSAL_DESCRIPTION, VOTING_DURATION);
            await votingSystemContract.vote(0);

            await expect(votingSystemContract.vote(0))
                .to.be
                .revertedWithCustomError(votingSystemContract, "AlreadyVoted");
        });

        it("Should check if voting reverts when voting period has already ended", async function() {
            const {votingSystemContract} = await loadFixture(deployVotingSystemFixture);
            await votingSystemContract.createProposal(PROPOSAL_DESCRIPTION, VOTING_DURATION);
            await time.increase(VOTING_DURATION + 1)

            await expect(votingSystemContract.vote(0))
                .to.be
                .revertedWithCustomError(votingSystemContract, "VotingEnded");
        });

        it("Should check if voting reverts when proposal has been executed", async function() {
            const {votingSystemContract} = await loadFixture(deployVotingSystemFixture);

            const creationTime = await time.latest();

            await votingSystemContract.createProposal(PROPOSAL_DESCRIPTION, VOTING_DURATION);
            await time.increaseTo(creationTime + VOTING_DURATION + 1);
            await votingSystemContract.executeProposal(0);

            await expect(votingSystemContract.vote(0))
                .to.be
                .revertedWithCustomError(votingSystemContract, "VotingEnded");
        });

        it("Should check if VoteCast event is emitted upon successful vote", async function() {
            const {votingSystemContract} = await loadFixture(deployVotingSystemFixture);
            await votingSystemContract.createProposal(PROPOSAL_DESCRIPTION, VOTING_DURATION);

            expect(await votingSystemContract.vote(0))
                .to.emit(votingSystemContract, "VoteCast");
        });
    })

    describe("Proposal Mechanism", function () {
        it("Should check if proposal execution will revert if not executed by owner", async function() {
            const {votingSystemContract} = await loadFixture(deployVotingSystemFixture);
            //await votingSystemContract.createProposal(PROPOSAL_DESCRIPTION, VOTING_DURATION);

            const [,user] = await ethers.getSigners();
            await expect( votingSystemContract.connect(user).executeProposal(0))
                    .to.be
                    .revertedWithCustomError(votingSystemContract, "NotOwner");
        });

        it("Should check if proposal execution reverts when invalid proposalId is used", async function () {
            const {votingSystemContract} = await loadFixture(deployVotingSystemFixture);
            await expect( votingSystemContract.executeProposal(2))
                .to.be.revertedWithCustomError(votingSystemContract, "InvalidProposal");
        });

        it("Should check if proposal execution reverts when voting period is not ended", async function () {
            const {votingSystemContract} = await loadFixture(deployVotingSystemFixture);
            await votingSystemContract.createProposal(PROPOSAL_DESCRIPTION, VOTING_DURATION);

            await expect( votingSystemContract.executeProposal(0))
                .to.be.revertedWithCustomError(votingSystemContract, "VotingNotEnded");
        });
    })
  })

  