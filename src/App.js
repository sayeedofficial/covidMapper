import React, { useRef, useEffect } from "react";
import "./App.scss";
import mapboxgl from "mapbox-gl";

// React hook to fetch the data
import useSWR from "swr";
// npm module to get ISO Code for countries
import lookup from "country-code-lookup";
// Mapbox css - needed to make tooltips work later
import "mapbox-gl/dist/mapbox-gl.css";

//Access Token from Mapbox
mapboxgl.accessToken =
  "pk.eyJ1IjoiYWRpdGlybSIsImEiOiJjazlweW5odnIwZjd4M2tueGh1Z2R0cHVxIn0.62F6sbO7mz3aR9hMvXf0YA";

function App() {
  // DOM element to render map
  const mapboxElRef = useRef(null);

  //Addition of covid-19 Data
  const fetcher = (url) =>
    fetch(url)
      .then((r) => r.json())
      .then((data) =>
        data.map((point, index) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [
              point.coordinates.longitude,
              point.coordinates.latitude,
            ],
          },
          properties: {
            id: index,
            country: point.country,
            province: point.province,
            cases: point.stats.confirmed,
            deaths: point.stats.deaths,
          },
        }))
      );

  const { data } = useSWR("https://corona.lmao.ninja/v2/jhucsse", fetcher);

  // Initialize the map
  useEffect(() => {
    if (data) {
      const map = new mapboxgl.Map({
        container: mapboxElRef.current,
        style: "mapbox://styles/mapbox/streets-v9",
        center: [16, 27],
        zoom: 2,
      });

      // Add navigation controls to the top right of the canvas
      //For zoom-in and zoom-out option!!!
      map.addControl(new mapboxgl.NavigationControl());

      map.once("load", function () {
        map.addSource("points", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: data,
          },
        });

        // Add our layer
        map.addLayer({
          id: "circles",
          source: "points", // this should be the id of source
          type: "circle",
          paint: {
            "circle-opacity": 0.75,
            "circle-stroke-width": [
              "interpolate",
              ["linear"],
              ["get", "cases"],
              1,
              1,
              100000,
              1.05,
            ],
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "cases"],
              1,
              5,
              1000,
              8,
              4000,
              10,
              8000,
              15,
              12000,
              18,
              100000,
              25,
            ],
            "circle-color": [
              "interpolate",
              ["linear"],
              ["get", "cases"],
              1,
              "#ffffb2",
              5000,
              "#fed976",
              10000,
              "#feb24c",
              25000,
              "#fd8d3c",
              50000,
              "#fc4e2a",
              75000,
              "#e31a1c",
              100000,
              "#b10026",
            ],
          },
        });

        //Mapbox Popup
        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
        });

        let lastId;

        //Mouse move event
        map.on("mousemove", "circles", (e) => {
          const id = e.features[0].properties.id;

          /*VIMP condition : Processing of tooltip only if id are different*/
          if (id !== lastId) {
            lastId = id;
            const {
              cases,
              deaths,
              country,
              province,
            } = e.features[0].properties;

            // Change the pointer type on mousepointer
            map.getCanvas().style.cursor = "pointer";

            const coordinates = e.features[0].geometry.coordinates.slice();

            const countryISO =
              lookup.byCountry(country)?.iso2 ||
              lookup.byInternet(country)?.iso2;

            const provinceHTML =
              province !== "null" ? `<p>Province: <b>${province}</b></p>` : "";

            const mortalityRate = ((deaths / cases) * 100).toFixed(2);

            const countryFlagHTML = Boolean(countryISO)
              ? `<img src="https://www.countryflags.io/${countryISO}/flat/64.png"></img>`
              : "";

            const HTML = `<p>Country: <b>${country}</b></p>
            ${provinceHTML}
            <p>Cases: <b>${cases}</b></p>
            <p>Deaths: <b>${deaths}</b></p>
            <p>Mortality Rate: <b>${mortalityRate}%</b></p>
            ${countryFlagHTML}`;

            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
              coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            popup.setLngLat(coordinates).setHTML(HTML).addTo(map);
          }
        });

        map.on("mouseleave", "circles", function () {
          //Reset last id
          lastId = undefined;

          map.getCanvas().style.cursor = "";
          popup.remove();
        });
      });
    }
  }, [data]);

  return (
    <div className="App">
      <div className="mapContainer">
       
        <div className="mapBox" ref={mapboxElRef} />
      </div>
    </div>
  );
}

export default App;
