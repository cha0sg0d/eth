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

describe('move to enemy planet', function () {
  let world: World;

  beforeEach(async function () {
    world = await fixtureLoader(defaultWorldFixture);

    await world.user1Core.initializePlayer(...makeInitArgs(SPAWN_PLANET_1));
    await world.user2Core.initializePlayer(...makeInitArgs(SPAWN_PLANET_2));
  });

  it('should conquer but not destroy planet if sufficient forces', async function () {
    await increaseBlockchainTime();

    const planet2Id = SPAWN_PLANET_2.id;
    const dist = 0; // instant move - just for testing correct decay application
    const silverSent = 0;

    // drain planet first
    await world.user2Core.move(
      ...makeMoveArgs(SPAWN_PLANET_2, LVL1_ASTEROID_1, dist, 95000, silverSent)
    );

    await world.contracts.core.refreshPlanet(planet2Id);
    let planet2 = await world.contracts.core.planets(planet2Id);
    const planet2Pop = planet2.population.toNumber();
    const planet2Def = planet2.defense.toNumber();
    const defenseForce = Math.floor((planet2Pop * planet2Def) / 100);

    await world.user1Core.move(
      ...makeMoveArgs(SPAWN_PLANET_1, SPAWN_PLANET_2, dist, 40000, silverSent)
    );

    const planetArrival = (await world.contracts.getters.getPlanetArrivals(planet2Id))[0];
    const shipsMoved = planetArrival.popArriving.toNumber();

    await world.contracts.core.refreshPlanet(planet2Id);
    planet2 = await world.contracts.core.planets(planet2Id);

    expect(planet2.owner).to.equal(world.user1.address);

    // range of tolerances
    expect(planet2.population.toNumber()).to.be.above(shipsMoved - defenseForce - 1000);
    expect(planet2.population.toNumber()).to.be.below(shipsMoved - defenseForce + 1000);

    await world.contracts.core.refreshPlanet(planet2Id);
    const planet2Ext = await world.contracts.core.planetsExtendedInfo(planet2Id);
    expect(planet2Ext.destroyed).to.equal(false);
  });

  it('should find destroy threshold', async function () {
    await increaseBlockchainTime();
    //TODO: Set Destroy Threshold

    const gameConstants = await world.user1Core.gameConstants()
    expect(gameConstants.DESTROY_THRESHOLD.toNumber()).to.equal(2);
  });

  it('should destroy a planet if sufficient forces', async function () {
    await increaseBlockchainTime();

    const planet2Id = SPAWN_PLANET_2.id;
    const dist = 0; // instant move - just for testing correct decay application
    const silverSent = 0;

    // drain planet first
    await world.user2Core.move(
      ...makeMoveArgs(SPAWN_PLANET_2, LVL1_ASTEROID_1, dist, 95000, silverSent)
    );

    await world.contracts.core.refreshPlanet(planet2Id);
    let planet2 = await world.contracts.core.planets(planet2Id);
    const planet2Pop = planet2.population.toNumber();
    const planet2Def = planet2.defense.toNumber();
    const defenseForce = Math.floor((planet2Pop * planet2Def) / 100);

    await world.user1Core.move(
      ...makeMoveArgs(SPAWN_PLANET_1, SPAWN_PLANET_2, dist, 70000, silverSent)
    );
  
    await world.contracts.core.refreshPlanet(planet2Id);
    const planet2Ext = await world.contracts.core.planetsExtendedInfo(planet2Id);
    expect(planet2Ext.destroyed).to.equal(true);
      
    await expect(
      world.user1Core.move(
        ...makeMoveArgs(SPAWN_PLANET_1, SPAWN_PLANET_2, dist, 70000, silverSent)
      )
    ).to.be.revertedWith('planet is destroyed');
  });
});
