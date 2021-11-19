import { DarkForestCore, AstralColossus } from '@darkforest_eth/contracts/typechain';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { contracts, ethers } from 'hardhat';
import { Signer } from 'crypto';
import { TestLocation } from './utils/TestLocation';
import {
  conquerUnownedPlanet,
  feedSilverToCap,
  fixtureLoader,
  getArtifactsOwnedBy,
  getCurrentTime,
  getStatSum,
  hexToBigNumber,
  increaseBlockchainTime,
  makeFindArtifactArgs,
  makeInitArgs,
  makeMoveArgs,
  user1MintArtifactPlanet,
} from './utils/TestUtils';
import { defaultWorldFixture, World } from './utils/TestWorld';
import {
  ARTIFACT_PLANET_1,
  ARTIFACT_PLANET_2,
  LVL0_PLANET,
  LVL3_SPACETIME_1,
  LVL1_ASTEROID_1,
  LVL3_SPACETIME_2,
  LVL3_SPACETIME_3,
  LVL3_UNOWNED_NEBULA,
  LVL4_UNOWNED_DEEP_SPACE,
  LVL6_SPACETIME,
  SPACE_PERLIN,
  SPAWN_PLANET_1,
  SPAWN_PLANET_2,
} from './utils/WorldConstants';
import { BigNumber } from '@ethersproject/bignumber';
import { CORE_CONTRACT_ADDRESS } from '@darkforest_eth/contracts';

const { BigNumber: BN } = ethers;

const ARTIFACT_POINT_VALUES = [0, 2000, 10000, 200000, 3000000, 20000000];

describe('DarkForestDaoGift', function () {
  let world: World;
  let daoPlayer: AstralColossus;
  let playerColossus: AstralColossus;
  let maliciousPlayer: AstralColossus;
  let playerCore: DarkForestCore;
  let daoCore: DarkForestCore;
  let player: SignerWithAddress;
  let dao: SignerWithAddress;

  async function worldFixture() {
    const world = await fixtureLoader(defaultWorldFixture);

    // Initialize player
    playerCore = world.user1Core;
    daoCore = world.user2Core;
    player = world.user1;
    dao = world.user2;

    await playerCore.initializePlayer(...makeInitArgs(SPAWN_PLANET_1));
    // await daoCore.initializePlayer(...makeInitArgs(SPAWN_PLANET_2));
    

    // Conquer initial planets

    // Player 1
    await conquerUnownedPlanet(world, playerCore, SPAWN_PLANET_1, ARTIFACT_PLANET_1);
    await conquerUnownedPlanet(world, playerCore, SPAWN_PLANET_1, LVL1_ASTEROID_1);
    await conquerUnownedPlanet(world, playerCore, SPAWN_PLANET_1, LVL3_SPACETIME_1);

    // await increaseBlockchainTime();

    return world;
  }
  
  describe('main', async function () {
    beforeEach('load fixture', async function () {
      world = await fixtureLoader(worldFixture);


      // deploy the dao player
      let DaoContractPlayerFactory = await ethers.getContractFactory("AstralColossus");
      const owner = await DaoContractPlayerFactory.signer.getAddress()
      daoPlayer = await DaoContractPlayerFactory.deploy(
        owner,
        world.contracts.core.address,
        world.contracts.tokens.address
        ) as AstralColossus;
      await daoPlayer.deployed();
    
      await world.contracts.whitelist.addKeys([
        ethers.utils.id('XXXXX-XXXXX-XXXXX-XXXXX-XXXXX'),
      ]);
      
      // whitelist the dao player
      await world.contracts.whitelist.useKey('XXXXX-XXXXX-XXXXX-XXXXX-XXXXX', daoPlayer.address);


      console.log(`player address`, player.address);
      console.log(`owner address`, owner);
      console.log(`dao address`, daoPlayer.address);
      // initialize the dao player
      await daoPlayer.initializePlayer(...makeInitArgs(SPAWN_PLANET_2));

      playerColossus = daoPlayer.connect(player)
      console.log(`is dao initialized?`, (await world.contracts.core.players(daoPlayer.address)).isInitialized);
      console.log(`is player initialized?`, (await world.contracts.core.players(player.address)).isInitialized);

    });

    it('player can gift one rip w silver and receive planet back', async function (){
      await feedSilverToCap(world, playerCore, LVL1_ASTEROID_1, LVL3_SPACETIME_1);
      const planet = LVL3_SPACETIME_1;
      console.log('player addy', await player.address);

      console.log('dao signer', await playerColossus.signer.getAddress());
      const updateTx = await playerColossus.updatePlanetOwners([planet.id]);
      await updateTx.wait();
      const owner = await playerColossus.planetOwners(planet.id);
      console.log(`dao recognizes planet owner:`, owner);
      const transferTx = await playerCore.transferOwnership(planet.id, daoPlayer.address);
      await transferTx.wait()

      let planetDetails = await playerCore.planets(planet.id);
      let silver = planetDetails.silver.toNumber()
      console.log('planet silver: ', silver); 

      await expect(playerColossus.processAndReturnPlanets([planet.id],[]))
      .to.emit(playerColossus, "Contribution")
      .withArgs(player.address, silver / 1000);

    });

    it('player can gift one foundry and receive planet back', async function (){
      const planet = ARTIFACT_PLANET_1;
      await playerCore.refreshPlanet(planet.id)
      let planetDetails = await playerCore.planets(planet.id);
      let silver = planetDetails.silver.toNumber()
      console.log('planet silver: ', silver);
      // console.log('artifactPlanet', ARTIFACT_PLANET_1);

      await playerCore.prospectPlanet(ARTIFACT_PLANET_1.id);
      const updateTx = await playerColossus.updatePlanetOwners([planet.id]);
      await updateTx.wait()
      await playerColossus.updatePlanetOwners([planet.id]);
      // await daoPlayer.updatePlanetOwners([planet.id]);
      const transferTx = await playerCore.transferOwnership(planet.id, daoPlayer.address);
      await transferTx.wait()
      const findArgs = makeFindArtifactArgs(planet);
      // console.log(`find args`, findArgs);
      // @ts-expect-error
      await expect(playerColossus.processAndReturnPlanets([],[findArgs]))
      .to.emit(playerColossus, "Contribution")
      .withArgs(player.address, 2000);
    
      planetDetails = await playerCore.planets(planet.id);
      // player owns planet
      expect(planetDetails.owner).to.equal(player.address);
      // planet now has an artifact
      const artifactsOnPlanet = await world.contracts.core.planetArtifacts(ARTIFACT_PLANET_1.id);
      expect(artifactsOnPlanet.length).to.not.be.equal(0);

      const artifact = await world.contracts.getters.getArtifactById(artifactsOnPlanet[0]);

      // artifact.discoverer is the dao contract
      expect (artifact.artifact.discoverer).to.equal(daoPlayer.address);

      const expectedArtifactValue = ARTIFACT_POINT_VALUES[artifact.artifact.rarity];
      console.log(`expecting ${expectedArtifactValue} points from artifact`); 
      expect ((await daoPlayer.contributions(player.address)).toNumber()).to.equal(expectedArtifactValue);

      // artifact.owner is the core contract (no owner until artifact is withdrawn)
      console.log('artifact owner', artifact.owner)
      console.log('dao addr', daoPlayer.address)
      console.log('player addr', player.address)
      //expect (artifact.owner).to.equal(player.address);

      // test getters
      const numPlayers = (await daoPlayer.playerCounter()).toNumber();
      for(let i = 0; i < numPlayers; i++) {
        const playerAddress = await daoPlayer.players(i);
        const playerScore = await daoPlayer.contributions(playerAddress);
        console.log(`addy ${playerAddress} score ${playerScore}`);
      }
      
    });

    it('only owner can register their ownership with the dao', async function (){
      // dao player can't register ownership of player1
      const planet = SPAWN_PLANET_1;

      maliciousPlayer = daoPlayer.connect(dao)

      await maliciousPlayer.updatePlanetOwners([planet.id]);

      /* planet owner has not been updated by malicious player */
      const res = await maliciousPlayer.planetOwners(planet.id);
      expect(res).to.equal(ethers.constants.AddressZero);

    });

    it('can handle both types of planets', async function () {
      await feedSilverToCap(world, playerCore, LVL1_ASTEROID_1, LVL3_SPACETIME_1);
      let planet = LVL3_SPACETIME_1; 

      await playerColossus.updatePlanetOwners([planet.id]);
      await playerCore.transferOwnership(planet.id, daoPlayer.address);
      const refreshTx = await playerCore.refreshPlanet(planet.id)
      await refreshTx.wait();
      let planetDetails = await playerCore.planets(planet.id);
      let silver = planetDetails.silver.toNumber()
      console.log('planet silver: ', silver);

      // await playerColossus.processAndReturnPlanets([planet.id],[]);

      planet = ARTIFACT_PLANET_1;
      await playerCore.refreshPlanet(planet.id)
      planetDetails = await playerCore.planets(planet.id);

      await playerCore.prospectPlanet(ARTIFACT_PLANET_1.id);
      const updateTx = await playerColossus.updatePlanetOwners([planet.id]);
      await updateTx.wait()
      await playerColossus.updatePlanetOwners([planet.id]);
      // await daoPlayer.updatePlanetOwners([planet.id]);
      const transferTx = await playerCore.transferOwnership(planet.id, daoPlayer.address);
      await transferTx.wait()
      const findArgs = makeFindArtifactArgs(planet);
      // console.log(`find args`, findArgs);
      // @ts-expect-error
      await expect(playerColossus.processAndReturnPlanets([LVL3_SPACETIME_1.id],[findArgs]))
      .to.emit(daoPlayer, "Contribution")
      .withArgs(player.address, 2000 + (silver / 1000));
    
      await playerCore.refreshPlanet(planet.id)
      planetDetails = await playerCore.planets(planet.id);
      // player owns planet
      expect(planetDetails.owner).to.equal(player.address);
      // planet now has an artifact
      const artifactsOnPlanet = await world.contracts.core.planetArtifacts(ARTIFACT_PLANET_1.id);
      expect(artifactsOnPlanet.length).to.not.be.equal(0);

      const artifact = await world.contracts.getters.getArtifactById(artifactsOnPlanet[0]);

      // artifact.discoverer is the dao contract
      expect (artifact.artifact.discoverer).to.equal(daoPlayer.address);

      // const expectedArtifactValue = ARTIFACT_POINT_VALUES[artifact.artifact.rarity];
      // console.log(`expecting ${expectedArtifactValue} points from artifact`); 
      // expect ((await daoPlayer.contributions(player.address)).toNumber()).to.equal(expectedArtifactValue);


      const numPlayers = (await daoPlayer.playerCounter()).toNumber();
      expect(numPlayers).to.equal(1);

    });

    it('will only increment once for two simultaneous scores', async function () {
     const planet = LVL3_SPACETIME_1; // no silver
      await playerCore.refreshPlanet(planet.id)
      let planetDetails = await playerCore.planets(planet.id);
      let silver = planetDetails.silver.toNumber()
      console.log('planet silver: ', silver);

      const updateTx = await playerColossus.updatePlanetOwners([planet.id]);
      await updateTx.wait()
      const transferTx = await playerCore.transferOwnership(planet.id, daoPlayer.address);
      await transferTx.wait();
      const processtX = await playerColossus.processAndReturnPlanets([planet.id],[]);
      await processtX.wait();
    });

  });
});
