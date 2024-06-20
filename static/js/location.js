"use strict";

let app = {};

// Declare the data.
app.data = {
    data: function () {
        return {
            clicked_species: '',

            region_checklists: [],
            species_and_info: [], //list of species and their sightings {species_name, count, date, time}
            species_and_count: [],

            top_contributors: [],

            is_chart: false,
            is_loading_data: false,
            show_notif: false,

            lat1: '',
            long1: '',
            lat2: '',
            long2: '',
        }
    },
    methods: {
        loading_data() {
            setTimeout(() => {
                app.vue.show_notif = true;
            }, 3000);
            if (app.vue.is_loading_data) {
                app.vue.show_notif = false;
            }
        },
        bird_clicked(species_name) {
            this.clicked_species = species_name;
            console.log("current species: " + this.clicked_species)
            d3.select("#flexChart").selectAll("*").remove();
            this.renderLocChart(species_name);
            this.is_chart = true;
        },
        get_top_contributors() {
            for(let i = 0; i < app.vue.region_checklists.length; i++) {
                let user_email = app.vue.region_checklists[i].user_email;
                let contributor = app.vue.top_contributors.find(c => c.email === user_email);
                if (contributor) {
                    contributor.count++;
                } else {
                    app.vue.top_contributors.push({ email: user_email, count: 1 });
                }
            }
            app.vue.top_contributors.sort((a, b) => (a.count < b.count) ? 1 : -1);
        },
        get_coords() {
            this.lat1 = localStorage.getItem('lat1');
            this.long1 = localStorage.getItem('long1');
            this.lat2 = localStorage.getItem('lat2');
            this.long2 = localStorage.getItem('long2');
        },
        get_species_and_info() {
            app.vue.is_loading_data = true;
            let requests = [];
            for (let i = 0; i < this.region_checklists.length; i++) {
                let checklist_id = this.region_checklists[i].checklist_id;
                let request = axios.get(get_sightings_in_checklist_url, {
                    params: {
                        checklist_id: checklist_id
                    }
                });
                requests.push(request);
            }
            let responses = [];
            let count = 0;
            let processResponse = (i, r) => {
                let checklist_sightings = r.data.sightings; //dict of sightings in current checklist
                for (let j = 0; j < checklist_sightings.length; j++) {
                    let species_name = checklist_sightings[j].species_name;
                    let count = checklist_sightings[j].count;
                    let date = this.region_checklists[i].date_observed;
                    let time = this.region_checklists[i].time_observed;

                    let new_species_and_info = {
                        species_name: species_name,
                        count: count,
                        date: date,
                        time: time
                    }
                    this.species_and_info.push(new_species_and_info);
                }
                count++;
                if (count === this.region_checklists.length) {
                    this.combine_species();
                    app.vue.is_loading_data = false;
                }
            };
            for (let i = 0; i < requests.length; i++) {
                requests[i].then(processResponse.bind(this, i));
            }
        },
        combine_species() {
            app.vue.species_and_count = [];
            let speciesMap = new Map();
            for (let i = 0; i < app.vue.species_and_info.length; i++) {
                let species_name = app.vue.species_and_info[i].species_name;
                let count = app.vue.species_and_info[i].count;
                if (speciesMap.has(species_name)) {
                    speciesMap.set(species_name, speciesMap.get(species_name) + count);
                } else {
                    speciesMap.set(species_name, count);
                }
            }
            speciesMap.forEach((count, species_name) => {
                let new_species_and_count = {
                    species_name: species_name,
                    count: count
                }
                app.vue.species_and_count.push(new_species_and_count);
            });
        },
        renderLocChart: function (species_name) {
            const margin = { top: 10, right: 50, bottom: 20, left: 50 },
                width = 800 - margin.left - margin.right,
                height = 330 - margin.top - margin.bottom;

            const svg = d3.select("#flexChart")
                .append("svg")
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
                .attr("preserveAspectRatio", "xMidYMid meet")
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            //read data
            var data = [];
            for (let i = 0; i < app.vue.species_and_info.length; i++) {
                if (app.vue.species_and_info[i].species_name === species_name) {
                    data.push({
                        date: new Date(app.vue.species_and_info[i].date),
                        time: app.vue.species_and_info[i].time,
                        count: app.vue.species_and_info[i].count
                    });
                }
            }

            const combinedData = [];
            data.forEach(d => {
                const existingData = combinedData.find(item => new Date(item.date).toISOString().split('T')[0] === new Date(d.date).toISOString().split('T')[0]);
                if (existingData) {
                    existingData.count += d.count;
                } else {
                    combinedData.push(d);
                }
            });

            const x = d3.scaleTime()
                .domain([d3.timeDay.offset(d3.min(combinedData, d => new Date(d.date)), -1), d3.timeDay.offset(d3.max(combinedData, d => new Date(d.date)), 1)])
                .range([0, width]);

            const y = d3.scaleLinear()
                .domain([0, d3.max(combinedData, d => d.count)])
                .range([height, 0]);

            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x));

            svg.append("g")
                .call(d3.axisLeft(y));

            svg.selectAll("dot")
                .data(combinedData)
                .enter()
                .append("circle")
                .attr("cx", d => x(new Date(d.date)))
                .attr("cy", d => y(d.count))
                .attr("r", 5)
                .attr("fill", "steelblue");

            svg.selectAll("text.label")
                .data(combinedData)
                .enter()
                .append("text")
                .attr("x", d => x(new Date(d.date)) + 5)
                .attr("y", d => y(d.count) - 10)
                .text(d => new Date(d.date).toISOString().split('T')[0])
                .attr("font-size", "10px")
                .attr("fill", "black");

            combinedData.sort((a, b) => new Date(a.date) - new Date(b.date));
            svg.append("path")
                .datum(combinedData)
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 3)
                .attr("d", d3.line()
                    .x(d => x(new Date(d.date)))
                    .y(d => y(d.count))
                );

            svg.append("text")
                .attr("text-anchor", "middle")
                .attr("transform", `translate(-40,${height / 2})rotate(-90)`)
                .style("font-size", "12px")
                .text("Number of Sightings");
        }
    },
    mounted() {
        this.get_coords();
        console.log("coords:\n" + this.lat1 + ',\n' + this.long1 + ',\n' + this.lat2 + ',\n' + this.long2)
        axios.get(get_checklists_in_region_url, {
            params: {
                lat1: this.lat1,
                long1: this.long1,
                lat2: this.lat2,
                long2: this.long2
            }
        })
            .then(function (r) {
                app.vue.region_checklists = r.data.checklists;
                app.vue.get_species_and_info();
                app.vue.species_and_info.sort((a, b) => (a.count < b.count) ? 1 : -1)
                console.log(app.vue.species_and_info)
                app.vue.get_top_contributors();
            })
    }
};

app.vue = Vue.createApp(app.data).mount("#app");

app.load_data = function () {
    app.vue.loading_data();
}

app.load_data();