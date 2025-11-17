import React from "react";

const AboutOverviewPage = () => {
  return (
    <section className="page page--about-overview">
      <div className="page-header">
        <div className="container tight">
          <h1>Overview</h1>
        </div>
      </div>
      <section className="page-section container">
        <h2>About DataCommon</h2>
        <p>
          DataCommon is the Open Data portal that brings together data from the Census Bureau, state agencies, municipalities, and MAPC's work and reformats it
          in a way that makes it easy to see and download town-by-town and regional statistics. The datasets pages allow users to explore data on a specific
          topic for a range of geographies including census tracts, municipalities, counties, regions, and the state. The Community Profile pages provide a
          central location where users can see data describing the population, housing characteristics, economy, transportation patterns, and more for each of
          the 351 cities and towns in Massachusetts. The Gallery section of DataCommon has maps and charts that tell different stories about our region.
        </p>
      </section>

      <section className="page-section container">
        <h2>Who we are</h2>
        <p>
          MAPC is the regional planning agency serving the people who live and work in the 101 cities and towns of Greater Boston. MAPC is governed by
          representatives from each city and town in our region, as well as gubernatorial appointees and designees of major public agencies. Through our work on
          regional planning and research, we seek to build a more equitable, sustainable, collaborative, and climate-resilient future for all.
        </p>
        <p>
          This tool and the data published to it are created, cleaned, and maintained by{" "}
          <a href="https://www.mapc.org/our-work/expertise/data-services/" target="_blank" rel="noopener noreferrer">
            MAPC's Data Services
          </a>{" "}
          team. If you encounter any issues with a dataset or want to see us publish a dataset that is not currently available, please let us know through{" "}
          <a href="https://airtable.com/appqSr3MqAkN1GCfb/pagdcSeY2bc4rblam/form" target="_blank" rel="noopener noreferrer">
            this form
          </a>
          . If you encounter any issues with the website or want to recommend a new feature that would make the site better for you to use, please let us know
          through{" "}
          <a href="https://airtable.com/appvsTkjC3FUe4yZ1/pagrTq8UqNU1zcrCL/form" target="_blank" rel="noopener noreferrer">
            this form
          </a>
          . To contact someone on the team about DataCommon email <a href="mailto:datacommon@mapc.org">datacommon@mapc.org</a>.
        </p>
      </section>
    </section>
  );
};

export default AboutOverviewPage;
