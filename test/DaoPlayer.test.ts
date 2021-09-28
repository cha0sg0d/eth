import { DarkForestCore, DaoContractPlayer } from '@darkforest_eth/contracts/typechain';
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
  let daoPlayer: DaoContractPlayer;
  let playerCore: DarkForestCore;
  let daoCore: DarkForestCore;
  let player: SignerWithAddress;
  let dao: SignerWithAddress;

  async function worldFixture() {
    const world = await fixtureLoader(defaultWorldFixture);

    // Initialize player
    playerCore = world.user1Core;
    player = world.user1;
    dao = world.user2;

    await playerCore.initializePlayer(...makeInitArgs(SPAWN_PLANET_1));

    // Conquer initial planets

    // Player 1
    await conquerUnownedPlanet(world, playerCore, SPAWN_PLANET_1, ARTIFACT_PLANET_1);
    await conquerUnownedPlanet(world, playerCore, SPAWN_PLANET_1, LVL1_ASTEROID_1);
    await conquerUnownedPlanet(world, playerCore, SPAWN_PLANET_1, LVL3_SPACETIME_1);
    await feedSilverToCap(world, playerCore, LVL1_ASTEROID_1, LVL3_SPACETIME_1);

    // await increaseBlockchainTime();

    return world;
  }
  
  describe('main', async function () {
    beforeEach('load fixture', async function () {
      world = await fixtureLoader(worldFixture);


      // deploy the dao player
      let DaoContractPlayerFactory = await ethers.getContractFactory("DaoContractPlayer");
      daoPlayer = await DaoContractPlayerFactory.deploy(
        world.contracts.core.address,
        world.contracts.tokens.address
        ) as DaoContractPlayer;
      await daoPlayer.deployed();
    
      await world.contracts.whitelist.addKeys([
        ethers.utils.id('XXXXX-XXXXX-XXXXX-XXXXX-XXXXX'),
      ]);
      
      // whitelist the dao player
      await world.contracts.whitelist.useKey('XXXXX-XXXXX-XXXXX-XXXXX-XXXXX', daoPlayer.address);

      // initialize the dao player
      await daoPlayer.initializePlayer(...makeInitArgs(SPAWN_PLANET_2));
  
      await expect((await world.contracts.core.players(daoPlayer.address)).isInitialized).is.equal(
        true
      );
      daoPlayer = daoPlayer.connect(player)

    });

    it('player can gift one planet w silver and receive planet back', async function (){
      const planet = LVL3_SPACETIME_1;
      await playerCore.refreshPlanet(planet.id)
      let planetDetails = await playerCore.planets(planet.id);
      let silver = planetDetails.silver.toNumber()
      console.log('planet silver: ', silver);

      await daoPlayer.updatePlanetOwners([planet.id]);
      await playerCore.transferOwnership(planet.id, daoPlayer.address);
      await daoPlayer.processAndReturnPlanets([planet.id],[]);

      // player's contribution has gone up silver amount
      expect ((await daoPlayer.contributions(player.address)).toNumber()).to.equal(planetDetails.silver.toNumber());

      await playerCore.refreshPlanet(planet.id)
      planetDetails = await playerCore.planets(planet.id);
      silver = planetDetails.silver.toNumber()
      // no more silver on planet
      expect(silver).to.equal(0);
      // player owns planet.
      expect(planetDetails.owner).to.equal(player.address);
    });

    it('player can gift one foundry and receive planet back', async function (){
      const planet = ARTIFACT_PLANET_1;
      await playerCore.refreshPlanet(planet.id)
      let planetDetails = await playerCore.planets(planet.id);
      let silver = planetDetails.silver.toNumber()
      console.log('planet silver: ', silver);
      // console.log('artifactPlanet', ARTIFACT_PLANET_1);

      await playerCore.prospectPlanet(ARTIFACT_PLANET_1.id);
      await daoPlayer.updatePlanetOwners([planet.id]);
      await playerCore.transferOwnership(planet.id, daoPlayer.address);
      const findArgs = makeFindArtifactArgs(planet);
      // console.log(`find args`, findArgs);
      // @ts-expect-error
      await daoPlayer.processAndReturnPlanets([],[findArgs]);
      

      await playerCore.refreshPlanet(planet.id)
      planetDetails = await playerCore.planets(planet.id);
      // player owns planet.
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
      
    });

    it.skip('should allow daoPlayer to initialize after whitelisted', async function () {
      await world.contracts.whitelist.useKey('XXXXX-XXXXX-XXXXX-XXXXX-XXXXX', daoPlayer.address);

      await daoPlayer.initializePlayer(...makeInitArgs(SPAWN_PLANET_2));
  
      await expect((await world.contracts.core.players(daoPlayer.address)).isInitialized).is.equal(
        true
      );
    });

  });
});
