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
    daoCore = world.user2Core;
    player = world.user1;
    dao = world.user2;

    await playerCore.initializePlayer(...makeInitArgs(SPAWN_PLANET_1));
    await daoCore.initializePlayer(...makeInitArgs(SPAWN_PLANET_2));

    // Conquer initial planets

    //// Player 1
    await conquerUnownedPlanet(world, playerCore, SPAWN_PLANET_1, ARTIFACT_PLANET_1);
    await conquerUnownedPlanet(world, playerCore, SPAWN_PLANET_1, LVL1_ASTEROID_1);
    await conquerUnownedPlanet(world, playerCore, SPAWN_PLANET_1, LVL3_SPACETIME_1);
    await feedSilverToCap(world, playerCore, LVL1_ASTEROID_1, LVL3_SPACETIME_1);
    //// Player 2
    await conquerUnownedPlanet(world, daoCore, SPAWN_PLANET_2, ARTIFACT_PLANET_2);
    await conquerUnownedPlanet(world, daoCore, SPAWN_PLANET_2, LVL3_SPACETIME_2);
    await increaseBlockchainTime();

    return world;
  }
  
  describe('main', async function () {
    beforeEach('load fixture', async function () {
      world = await fixtureLoader(worldFixture);


      // deploy the dao player
      let DaoContractPlayerFactory = await ethers.getContractFactory("DaoContractPlayer");
      daoPlayer = await DaoContractPlayerFactory.deploy(world.contracts.core.address) as DaoContractPlayer;
      await daoPlayer.deployed();
      
      // whitelist the dao player
      // const apiKey: string = 'XXXXX-XXXXX-XXXXX-XXXXX-XXXXX'
      // const akReceipt = await world.contracts.whitelist.addKeys([ethers.utils.id(apiKey)]);
      // await akReceipt.wait();
  
      // const ukReceipt = await world.contracts.whitelist.useKey(apiKey, daoPlayer.address);
      // await ukReceipt.wait();
    });

    it.skip('player can transfer planet', async function (){
      console.log(`deploy success: ${daoPlayer.address}`);

    });
  });
});
