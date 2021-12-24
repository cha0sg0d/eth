import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';
import {
  conquerUnownedPlanet,
  fixtureLoader,
  increaseBlockchainTime,
  makeInitArgs,
  makeMoveArgs,
} from './utils/TestUtils';
import { defaultWorldFixture, growingWorldFixture, World } from './utils/TestWorld';
import {
  LVL0_PLANET_OUT_OF_BOUNDS,
  LVL1_ASTEROID_1,
  LVL1_ASTEROID_2,
  LVL1_PLANET_NEBULA,
  LVL1_QUASAR,
  LVL2_PLANET_SPACE,
  LVL4_UNOWNED_DEEP_SPACE,
  SMALL_INTERVAL,
  SPAWN_PLANET_1,
  SPAWN_PLANET_2,
} from './utils/WorldConstants';

const { BigNumber: BN } = ethers;

describe('DarkForestMove', function () {
  let world: World;

  describe('in a shrinking universe', async function () {
    let initialRadius: BigNumber;

    beforeEach(async function () {
      world = await fixtureLoader(growingWorldFixture);
        
      await world.user1Core.initializePlayer(...makeInitArgs(SPAWN_PLANET_1));
      // await world.user2Core.initializePlayer(...makeInitArgs(SPAWN_PLANET_2));
      // await increaseBlockchainTime();
    });

    it('should decrease in radius size over time', async function () {
      const gameConstants = await world.user1Core.gameConstants()
      console.log("start time:", gameConstants.START_TIME.toNumber())
      const initRadius = await world.contracts.core.worldRadius();
      await increaseBlockchainTime(5);

      await world.user1Core.move(
        ...makeMoveArgs(SPAWN_PLANET_1, SPAWN_PLANET_2, 0, 40000, 0)
      ); 

      const currRadius = await world.contracts.core.worldRadius();
      expect(currRadius.toNumber()).lessThan(initRadius.toNumber());
      // expect(gameConstants.START_TIME.toNumber()).to.equal(2);
      // console.log
      // console.log(await world.contracts.core.getRadius());
    });

  });
});



