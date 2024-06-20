"use strict";

// This will be the object that will contain the Vue attributes and be used to initialize it.
let app = {};

app.data = {
    // Data function returns the initial state for the Vue instance
    data: function() {
        return {
            map: null,                   // Map instance
            birds: [],                   // List of all birds
            filter_birds: [],            // List of filtered birds based on search
            bird_clicked: "",            // Name of the clicked bird
            search_string: "",           // Search string for filtering birds
            current_user: "",            // Current user's name
            bird_clicked_id: -1,         // ID of the clicked bird
            user_location: [0, 0],       // User's location (latitude, longitude)
            markers: [],                 // List of map markers
            sorted: true,                // Sort order for birds (true for ascending, false for descending)
        };
    },
    methods: {
        // Finds the index of a bird sighting by ID in the given array
        find_sighting_idx: function(id, arr) {
            for (let i = 0; i < arr.length; i++) {
                if (arr[i].id === id) {
                    return i;
                }
            }
            return null;
        },

        // Filters the birds list based on the search string
        search: function() {
            let self = this;
            self.filter_birds = self.birds.filter(bird => bird.name.toLowerCase().includes(this.search_string.toLowerCase()));
        },

        // Handles clicking on a bird
        click_bird: function(id) {
            let self = this;
            let index = self.find_sighting_idx(id, self.filter_birds);
            
            // Toggle clicked bird
            if (this.bird_clicked_id === id) {
                this.bird_clicked_id = -1;
                this.birds[this.birds.findIndex(bird => bird.id === id)].clicked = false;
            } else {
                // Deselect all species
                this.birds.forEach(bird => bird.clicked = false);
                // Select the clicked species
                this.bird_clicked_id = id;
                this.birds[this.birds.findIndex(bird => bird.id === id)].clicked = true;
            }
            
            // Fetch bird sightings data
            axios.get(click_bird_url, {params: {bird_species: self.filter_birds[index].name}}).then(function(r) {
                self.clearMarker();
                for (let i = 0; i < r.data.sightings_data.length; i++) {
                    let latitude = r.data.sightings_data[i].checklists.latitude;
                    let longitude = r.data.sightings_data[i].checklists.longitude;
                    self.user_location = [latitude, longitude];
                    self.map.setView(self.user_location, 13);
                    self.addMarker(latitude, longitude, r.data.sightings_data[i].checklists.date_observed);
                    self.renderChart(r.data.sightings_data);
                }
            });
        },

        // Sorts the birds list by date and time
        sort_birds: function() {
            let self = this;
            
            function compareDateTime(a, b) {
                let dateTimeA = new Date(`${a.date}T${a.time}`);
                let dateTimeB = new Date(`${b.date}T${b.time}`);
                return !self.sorted ? dateTimeB - dateTimeA : dateTimeA - dateTimeB;
            }

            self.filter_birds.sort(compareDateTime);
            self.sorted = !self.sorted;
            console.log(self.sorted);
        },

        // Renders the chart for bird sightings over time
        renderChart: function(sightings) {
            d3.select("#sightings-chart").selectAll("*").remove();
            
            const margin = { top: 50, right: 75, bottom: 75, left: 50 },
                  width = 500 - margin.left - margin.right,
                  height = 300 - margin.top - margin.bottom;

            const svg = d3.select("#sightings-chart")
                          .append("svg")
                          .attr("width", width + margin.left + margin.right)
                          .attr("height", height + margin.top + margin.bottom)
                          .append("g")
                          .attr("transform", `translate(${margin.left},${margin.top})`);

            const parseDate = d3.timeParse("%Y-%m-%d");
            const formatDate = d3.timeFormat("%m/%d/%y");

            sightings.forEach(d => {
                d.date = parseDate(d.checklists.date_observed);
            });

            const x = d3.scaleTime()
                        .domain(d3.extent(sightings, d => d.date))
                        .range([0, width]);

            const xAxis = svg.append("g")
                             .attr("transform", `translate(0,${height})`)
                             .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%m/%d/%y")));

            xAxis.selectAll("text")
                 .attr("transform", "rotate(-45)")
                 .style("text-anchor", "end");

            const y = d3.scaleLinear()
                        .domain([0, d3.max(sightings, d => d.sightings.count)])
                        .range([height, 0]);

            svg.append("g")
               .call(d3.axisLeft(y));

            svg.selectAll("circle")
               .data(sightings)
               .enter()
               .append("circle")
               .attr("cx", d => x(d.date))
               .attr("cy", d => y(d.sightings.count))
               .attr("r", 5)
               .attr("fill", "red");

            svg.append("text")
               .attr("x", width / 2)
               .attr("y", -20)
               .attr("text-anchor", "middle")
               .style("font-size", "16px")
               .style("font-weight", "bold")
               .text("Bird Sightings Over Time");

            svg.append("text")
               .attr("x", width / 2)
               .attr("y", height + margin.bottom - 10)
               .attr("text-anchor", "middle")
               .style("font-size", "12px")
               .text("Date");

            svg.append("text")
               .attr("text-anchor", "middle")
               .attr("transform", `translate(-40,${height / 2})rotate(-90)`)
               .style("font-size", "12px")
               .text("Number of Sightings");
        },

        // Renders the total bird sightings chart
        renderTotalChart: function(data) {
            // Clear previous chart if it exists
            d3.select("#total-chart").selectAll("*").remove();

            // Set the dimensions and margins of the graph
            const margin = { top: 30, right: 30, bottom: 75, left: 50 },
                  width = 450 - margin.left - margin.right,
                  height = 300 - margin.top - margin.bottom;

            // Append the svg object to the div
            const svg = d3.select("#total-chart")
                          .append("svg")
                          .attr("width", width + margin.left + margin.right)
                          .attr("height", height + margin.top + margin.bottom)
                          .append("g")
                          .attr("transform", `translate(${margin.left},${margin.top})`);

            // Format the data and parse the date
            const parseDate = d3.timeParse("%Y-%m-%d");
            data.forEach(d => {
                d.date = parseDate(d.date_observed);
                d.totalBirds = +d.total_birds;
            });

            // X scale
            const x = d3.scaleTime()
                        .domain(d3.extent(data, d => d.date))
                        .range([0, width]);

            // Y scale
            const y = d3.scaleLinear()
                        .domain([0, d3.max(data, d => d.totalBirds)])
                        .range([height, 0]);

            // Add the line
            svg.append("path")
               .datum(data)
               .attr("fill", "none")
               .attr("stroke", "steelblue")
               .attr("stroke-width", 1.5)
               .attr("d", d3.line()
                            .x(d => x(d.date))
                            .y(d => y(d.totalBirds))
                          );

            // Add the points
            svg.selectAll("dot")
               .data(data)
               .enter()
               .append("circle")
               .attr("cx", d => x(d.date))
               .attr("cy", d => y(d.totalBirds))
               .attr("r", 3)
               .attr("fill", "steelblue");

            // Add x-axis
            svg.append("g")
               .attr("transform", `translate(0,${height})`)
               .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%m/%d/%y"))) // Format date as mm/dd/yyyy
               .selectAll("text") // Select all the text elements for the x-axis
               .attr("transform", "rotate(-45)") // Rotate the text
               .style("text-anchor", "end"); // Align the text to the end

            // Add y-axis
            svg.append("g")
               .call(d3.axisLeft(y));

            // Add chart title
            svg.append("text")
               .attr("x", width / 2)
               .attr("y", -10)
               .attr("text-anchor", "middle")
               .style("font-size", "14px")
               .style("font-weight", "bold")
               .text("Total Bird Sightings");

            // Add x-axis title
            svg.append("text")
               .attr("x", width / 2)
               .attr("y", height + margin.bottom - 10)
               .attr("text-anchor", "middle")
               .style("font-size", "10px")
               .text("Date");

            // Add y-axis title
            svg.append("text")
               .attr("text-anchor", "middle")
               .attr("transform", `translate(-30,${height / 2})rotate(-90)`)
               .style("font-size", "10px")
               .text("Number of Sightings");
        },

        // Adds a marker to the map
        addMarker: function(lat, lng, label) {
            let marker = L.marker([lat, lng]).addTo(this.map);
            marker.bindPopup(label);
            this.markers.push(marker);
        },

        // Clears all markers from the map
        clearMarker: function() {
            let self = this;
            for (let i = 0; i < self.markers.length; i++) {
                self.map.removeLayer(self.markers[i]);
            }
            self.markers = [];
        },

        // Initializes the map
        initMap() {
            this.map = L.map('map').setView(this.user_location, 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.map);
        },

        // Sets the user's location using geolocation API
        setUserLocation() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(position => {
                    this.user_location = [position.coords.latitude, position.coords.longitude];
                    this.initMap();
                });
            } else {
                // Default to San Francisco if geolocation is not available
                this.user_location = [37.7749, -122.4194];
                this.initMap();
            }
        },
    },
    // Called when the Vue instance is mounted
    mounted() {
        this.setUserLocation();
    }
};

// Initialize the Vue instance
app.vue = Vue.createApp(app.data).mount("#app");

// Loads initial data from the server
app.load_data = function() {
    // Fetch user data and bird species information
    axios.get(get_userdata_url).then(function(r) {
        console.log(r.data);
        for (let i = 0; i < r.data.species_info.length; i++) {
            app.vue.birds.push({
                id: i,
                name: r.data.species_info[i].species_name,
                date: r.data.species_info[i].most_recent_date,
                time: r.data.species_info[i].time,
                clicked: false
            });
        }
        app.vue.user_location = [0, 0];
        app.vue.filter_birds = app.vue.birds;
        app.vue.current_user = r.data.current_user;
        console.log(app.vue.birds);
    });

    // Fetch data for rendering the total sightings chart
    axios.get(get_chart_data_url).then(function(r) {
        app.vue.renderTotalChart(r.data.result);
    });
};

// Load the initial data
app.load_data();
