import { useMemo } from "react";
import type { LoaderFunction } from "remix";
import { json, useLoaderData, useOutletContext, useSearchParams } from "remix";
import { VictoryChart, VictoryBar } from "victory";

import type { StateCurrent } from "~/api/covidtracking.com/v1/states/$state/current.json";
import { swrCache } from "~/cache.server";

import type { StateGraphData } from "../__index";

type StateInfo = { label: string; value: string; sublabel?: string };

type LoaderData = {
  stateInfo?: StateInfo[];
};

export let loader: LoaderFunction = async ({ request }) => {
  let url = new URL(request.url);
  let selectedState =
    url.searchParams.get("state")?.trim().toUpperCase() || undefined;

  let selectedStatePromise: Promise<StateCurrent> | undefined;
  if (selectedState && selectedState.length === 2) {
    selectedStatePromise = swrCache(
      new Request(
        `https://api.covidtracking.com/v1/states/${selectedState.toLowerCase()}/current.json`
      ),
      60
    ).then((r) => r.json() as Promise<StateCurrent>);
  }

  let stateCurrent = await selectedStatePromise;

  let stateInfo: StateInfo[] | undefined;
  if (stateCurrent) {
    let add = (
      value: number | null | undefined,
      label: string,
      format: (v: number) => string,
      sublabel?: string
    ) => {
      stateInfo = stateInfo || [];
      if (typeof value === "number") {
        stateInfo.push({ label, value: format(value), sublabel });
      }
    };

    add(
      stateCurrent.positive,
      "Positive",
      (v) => numberWithCommas(v, 0),
      "cases"
    );
    add(stateCurrent.death, "Deaths", (v) => numberWithCommas(v, 0), "deaths");
    add(stateCurrent.recovered, "Recovered", (v) => numberWithCommas(v, 0));
    add(stateCurrent.totalTestResults, "Tests", (v) => numberWithCommas(v, 0));
    add(
      stateCurrent.hospitalizedCurrently,
      "Hospitalized",
      (v) => numberWithCommas(v, 0),
      "currently"
    );
    add(
      stateCurrent.hospitalizedCumulative,
      "Hospitalized",
      (v) => numberWithCommas(v, 0),
      "cumulative"
    );
  }

  return json<LoaderData>({
    stateInfo,
  });
};

export default function Index() {
  let { stateInfo } = useLoaderData<LoaderData>();
  let stateGraphData = useOutletContext() as StateGraphData[];
  let [searchParams] = useSearchParams();
  let selectedState =
    searchParams.get("state")?.trim().toLowerCase() || undefined;

  let graphData = useMemo(() => {
    if (!selectedState) {
      return stateGraphData.slice(0, 7).map((state) => ({
        x: state.state,
        y: state.cases,
      }));
    }

    let index = stateGraphData.findIndex(
      (state) => state.state.toLowerCase() === selectedState
    );
    if (index === -1) {
      return stateGraphData.slice(0, 7).map((state) => ({
        x: state.state,
        y: state.cases,
      }));
    }

    if (index < 3) {
      return stateGraphData.slice(0, 7).map((state) => ({
        x: state.state,
        y: state.cases,
      }));
    }
    if (index > stateGraphData.length - 4) {
      return stateGraphData.slice(-7).map((state) => ({
        x: state.state,
        y: state.cases,
      }));
    }

    return stateGraphData.slice(index - 3, index + 4).map((state) => ({
      x: state.state,
      y: state.cases,
    }));
  }, [stateGraphData, selectedState]);

  return (
    <>
      <div className="w-full block md:grid md:grid-cols-3 mt-12">
        {stateInfo
          ? stateInfo.map((info) => (
              <div
                key={`${info.label}|${info.value}|${info.sublabel}`}
                className="stat place-items-center place-content-center"
              >
                <div className="stat-title">{info.label}</div>
                <div className="stat-value">{info.value}</div>
                {info.sublabel ? (
                  <div className="stat-desc">{info.sublabel}</div>
                ) : null}
              </div>
            ))
          : null}
      </div>

      <div className="w-full max-w-3xl mx-auto">
        <VictoryChart
          padding={80}
          style={{
            parent: {
              fontSize: "12px",
              overflow: "visible",
            },
          }}
        >
          <VictoryBar
            style={{
              data: {
                fill: ({ datum }) =>
                  datum.x === selectedState?.toUpperCase()
                    ? "#000000"
                    : "#c43a31",
                stroke: ({ datum }) =>
                  datum.x === selectedState?.toUpperCase()
                    ? "#000000"
                    : "#c43a31",
                fillOpacity: 0.7,
                strokeWidth: 3,
                fontSize: "12px",
              },
            }}
            alignment="start"
            data={graphData}
          />
        </VictoryChart>
      </div>
    </>
  );
}

function numberWithCommas(num: number, fixed: number = 0) {
  return num.toFixed(fixed).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
