import { useRef } from "react";
import type { LoaderFunction } from "remix";
import { json, Form, Outlet, useLoaderData, useSubmit } from "remix";

import type { CurrentStateMeta } from "~/api/covidtracking.com/v1/states/current.json";
import type { StateMeta } from "~/api/covidtracking.com/v1/states/info.json";
import type { Current } from "~/api/covidtracking.com/v1/us/current.json";
import { swrCache } from "~/cache.server";

export type StateGraphData = { name: string; state: string; cases: number };

type LoaderData = {
  cases: number;
  deaths: number;
  deathsToday: number;
  hospitalToday: number;
  selectedState?: string;
  states: { name: string; state: string }[];
  statesGraph: StateGraphData[];
};

export let loader: LoaderFunction = async ({ request }) => {
  let url = new URL(request.url);
  let selectedState =
    url.searchParams.get("state")?.trim().toLowerCase() || undefined;

  let [current, meta, statesMeta] = await Promise.all([
    swrCache(
      new Request("https://api.covidtracking.com/v1/us/current.json"),
      60
    )
      .then((r) => r.json() as Promise<Current[]>)
      .then((r) => r[0]),
    swrCache(
      new Request("https://api.covidtracking.com/v1/states/info.json"),
      60
    ).then((r) => r.json() as Promise<StateMeta[]>),
    swrCache(
      new Request("https://api.covidtracking.com/v1/states/current.json"),
      60
    ).then((r) => r.json() as Promise<CurrentStateMeta[]>),
  ]);

  let statesGraph: StateGraphData[] = [];
  for (let state of statesMeta) {
    if (typeof state.positive === "number") {
      statesGraph.push({
        name: state.state,
        state: state.state.toUpperCase(),
        cases: state.positive || 0,
      });
    }
  }
  statesGraph = statesGraph.sort((a, b) => (a.cases - b.cases > 0 ? 1 : -1));

  return json<LoaderData>({
    cases: current.positive,
    deaths: current.death,
    deathsToday: current.deathIncrease,
    hospitalToday: current.hospitalizedIncrease,
    selectedState,
    states: meta.map((state) => ({
      name: state.name,
      state: state.state.toLowerCase(),
    })),
    statesGraph,
  });
};

export let unstable_shouldReload = () => false;

export default function Index() {
  let {
    cases,
    deaths,
    deathsToday,
    hospitalToday,
    selectedState,
    states,
    statesGraph,
  } = useLoaderData<LoaderData>();

  let submit = useSubmit();
  let formRef = useRef<HTMLFormElement>(null);
  let submitForm = () => {
    if (formRef.current) {
      submit(formRef.current);
    }
  };

  return (
    <main>
      <div className="hero min-h-[26rem] bg-base-200">
        <div className="text-center hero-content">
          <div className="max-w-md">
            <h1 className="mb-5 text-5xl font-bold">COVID SUCKS</h1>
            <p className="mb-5">
              And if you're not doing your part, <em>YOU SUCK</em>
            </p>
          </div>
        </div>
      </div>

      <section className="my-24">
        <h1 className="px-4 mb-12 text-center text-4xl font-semibold">
          Just in the US alone
        </h1>

        <div className="w-full stats block md:grid md:grid-cols-3">
          <div className="stat place-items-center place-content-center">
            <div className="stat-title">Cases</div>
            <div className="stat-value text-error">
              {numberWithCommas(cases)}
            </div>
            <div className="stat-desc">April 5th, 2020 - Current</div>
          </div>
          <div className="stat place-items-center place-content-center">
            <div className="stat-title">Deaths</div>
            <div className="stat-value text-error">
              {numberWithCommas(deaths)}
            </div>
            <div className="stat-desc">April 5th, 2020 - Current</div>
          </div>
          <div className="stat place-items-center place-content-center">
            <div className="stat-title">Cases Today</div>
            <div className="stat-value text-error">
              {numberWithCommas(deathsToday)}
            </div>
            <div className="stat-desc">
              {numberWithCommas(hospitalToday, 0)} of them are hospitalized
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 my-24 text-center">
        <h1 className="px-4 mb-12 text-4xl font-semibold">
          How's your state doing?
        </h1>

        <Form ref={formRef}>
          <select
            name="state"
            className="select select-bordered w-full max-w-xs"
            defaultValue={selectedState}
            onChange={submitForm}
          >
            <option value="">Choose your state</option>
            {states.map((state) => (
              <option key={state.state} value={state.state}>
                {state.name}
              </option>
            ))}
          </select>
          <noscript>
            <button className="btn btn-ghost">submit</button>
          </noscript>
        </Form>

        <Outlet context={statesGraph} />
      </section>

      {/* <section className="px-4 py-24">
        <div className="prose max-w-lg mx-auto">
          <h1>What can you do?</h1>
          <h2>Start with human decency</h2>
          <p>
            What do I mean by this? When someone asks you to get a rapid test,
            don't bitch about it. There may be a reason you're not aware of and
            you might be putting thier life at risk by ignoring or lying about
            your results.
          </p>
          <h2>Wash your hands</h2>
          <p>
            Putting your hands in water isn't washing them. Use soap and water
            for more.
          </p>
          <h2>Wear a mask</h2>
          <p>
            I mean this should be obvious if you're not a complete moron, but it
            still has to be said. If you can't afford a mask, improvise the best
            you can.
          </p>
          <h2>Keep your distance</h2>
          <p>
            Personal space people! I know this is hard for some of you for
            whatever unknowable reason, but if you can touch someone you are too
            close.
          </p>
          <h2>Small dance parties</h2>
          <p>
            Keep it in your circle and host dance parties with the same close
            knit group of people instead of visiting those swampass factories
            known as clubs.
          </p>
          <h2>Clean stuff</h2>
          <p>
            You can wash things other than your hands. If someone is sick or not
            feeling well it's a good idea to disinfect items they touch
            frequently.
          </p>
        </div>
      </section> */}
    </main>
  );
}

function numberWithCommas(num: number, fixed: number = 0) {
  return num.toFixed(fixed).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
