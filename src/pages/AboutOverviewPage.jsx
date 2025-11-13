import React from "react";
import { useAirtableCMS} from "@mapc/airtable-cms";

const AboutOverviewPage = () => {

  const { data: logs } = useAirtableCMS({
    tableName: "Feature Update Logs",
    keyField: "description",
    fieldMapping: {
      description: "Description",
      updateDate: "Update Date",
    },
    sortBy: (a, b) => {
      return a.order - b.order;
    },
    asList: false,
  });
  console.log(logs);
  return (
    <section className="page page--about-overview container">
      <h1>About DataCommon</h1>
      <p>
        The Boston DataCommon is a collaborative platform that brings together
        data, stories, and tools to support informed action. This overview
        highlights the mission, partners, and guiding principles that shape the
        platform.
      </p>
    </section>
  );
};

export default AboutOverviewPage;

