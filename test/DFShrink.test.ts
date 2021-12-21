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

  describe('in a growing universe', async function () {
    let initialRadius: BigNumber;

    before(async function () {
      world = await fixtureLoader(growingWorldFixture);
      initialRadius = await world.contracts.core.worldRadius();
      const initArgs = makeInitArgs(SPAWN_PLANET_2, initialRadius.toNumber());

      await world.user1Core.initializePlayer(...initArgs);
      await increaseBlockchainTime();
    });

    it('should log start time', async function () {
      const gameConstants = await world.user1Core.gameConstants()
      console.log("start time:", gameConstants.START_TIME.toNumber())
      const initRadius = await world.contracts.core.worldRadius();
      await increaseBlockchainTime(5);
      const currRadius = await world.contracts.core.getRadius()
      // console.log("initRadius: ", initRadius, "radius", currRadius);

      // expect(gameConstants.START_TIME.toNumber()).to.equal(2);
      // console.log
      // console.log(await world.contracts.core.getRadius());
    });

  });
});



