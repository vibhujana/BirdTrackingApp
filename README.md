# Project: Bird Watching App

The goal of the project is to build a bird-watching app/site, loosely modeled on ebird.org.  The project has been chosen in a way that will let us play with many interesting features in web development, including developing responsive one-page apps, maps integration, user communication, and more. 

The project is organized around the following main pages: 

- Index page.  Welcomes users and shows a map of bird densities. 
- Checklist page.  Enables users to enter a checklist. 
- Stats page.  Enables users to see stats and compilations about their own data. 
- Location page.  Enables users to ask for details about a birding location. 

There can of course be auxiliary management pages built.  The four pages above should be developed in vue.js.  You can, for instance, assign one group member to develop each page. 

## Index page

This is the page users see when they log in. They should see a map, centered on their region, with a density indication of where birds have been seen. The page should contain links to submit a checklist (the checklist page) and “My birding” (the stats page). 
On the map, users should be able to draw a rectangle, and click on a button that says “statistics on region”.  This leads them to the statistics page for the selected region. 
The map is also governed by a species selection box.  Users can select a species, and the map will show the density of that species. 
### Species selection

There must be some way of choosing which species to display on the map. If no species is selected, you should show data for all species.  You can have a search box with autocomplete in which users can select the species, etc. 

## Checklist page

In this page, users can enter a checklist.  This page should be accessed by selecting a position on the map page, and click on an "enter checklist" button.  Users need to be logged in to enter a checklist. 

In the checklist page, you should have on top a search bar that enables to select the species, so that if one enters "spar" one sees only the sparrows.  Then, for each species, there should be a row in a table with species name, a place where users can enter a number of birds seen, and a button to increment the number of birds seen. 

When the user is done, they can click on a "submit" button, and the checklist is saved.

There should be some additional page where users see the list of checklists they have submitted, and where they can delete them, or go edit them (via the checklist page).  This "My Checklists" page 

## Location page

When users select a region on the map page and click on "region information" (or similar), they should be able to view the statistics for that region. The statistics should include:

- A list of species seen in the region, with the number of checklists and total number of sightings for the region. 
- Some kind of graph showing the number of birds in a species seen over time. For example, when one clicks on a species in the above list, such graph should be displayed. 
- Some information on the top contributors for the region. 

You can use the [D3.js](https://d3js.org/) library to create visualizations, or the [Chart.js](https://www.chartjs.org/) library.  Other libraries are also possible.

## User statistics

Users should be able to see their own statistics.  This page should show things like: 
- A list of all species they have seen, searchable.  When they click on a species, they should see some visualization of when they saw it, and if one liked, even where (you can include a map here). 
- Some visualization of how their bird-watching has trended in time. 