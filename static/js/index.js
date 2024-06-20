app = {};

app.data = {    
    data: function() {
        return {
            map: null,
            selected_species: "",
            species: [],
            heatmapLayer: null,
            drawing_coords: [],
            rectangle_coords: [],
            marker_coords: [],
            drawnItems: null,
            drawnRectangle: null,
            placed_marker: null,
            drawControl: null, // Add drawControl property to store the Draw control
            search_string: "", // Add search_string property to hold the text entered in the search bar
            filter_species: [], // Add filter_species property to hold the filtered list of species
        };
    },
    methods: {
        reloadData: function() {
            // Get map bounds
            let bounds = this.map.getBounds();
            let boundsString = `${bounds._southWest.lat},${bounds._southWest.lng},${bounds._northEast.lat},${bounds._northEast.lng}`;
    
            // Reload data with bounding box coordinates
            axios.get(heatmap_url, { params: { bounds: boundsString, selected_species: app.vue.selected_species } }).then(function (r) {
                let heatpoints = r.data.species_data.map(function(point) {
                    return [point.checklists.latitude, point.checklists.longitude, point.sightings.count/300];
                });
                if (app.vue.heatmapLayer) {
                    app.vue.map.removeLayer(app.vue.heatmapLayer);
                }
                app.vue.heatmapLayer = L.heatLayer(heatpoints, {
                    radius: 30,
                    blur: 15,
                    gradient: {0.4: 'blue', 0.6: 'lime', 1: 'red'}
                });
                app.vue.heatmapLayer.addTo(app.vue.map);
                console.log(heatpoints);
            });
        },
        selectSpecies: function(speciesName) {
            // If the clicked species is already selected, deselect it
            if (this.selected_species === speciesName) {
                this.selected_species = "";
                this.species[this.species.findIndex(species => species.species_name === speciesName)].selected = false;
            } else {
                // Deselect all species
                this.species.forEach(species => species.selected = false);
                // Select the clicked species
                this.selected_species = speciesName;
                this.species[this.species.findIndex(species => species.species_name === speciesName)].selected = true;
            }
            // Reload data after selecting or deselecting a species
            this.reloadData();
        },
        redirectToLocation: function(lat1, long1, lat2, long2) {
            console.log('redirectToLocation method called with coordinates:', lat1, long1, lat2, long2);
            localStorage.setItem('lat1', lat1);
            localStorage.setItem('long1', long1);
            localStorage.setItem('lat2', lat2);
            localStorage.setItem('long2', long2);
            window.location.href = "/cse-183-project/location";
        },
        redirectToChecklists: function(lat, lng) {
            localStorage.setItem('lat', lat);
            localStorage.setItem('lng', lng);
            window.location.href = "/cse-183-project/checklists";
            console.log('redirectToChecklists method called with coordinates:', lat, lng);
        },
        search: function() {
            // Filter species based on the search string
            let self = this;
            self.filter_species = self.species.filter(bird => bird.species_name.toLowerCase().includes(this.search_string.toLowerCase()));
        },
    },
    mounted: function() {
        this.map = L.map("map", {
            maxZoom: 19,  // You can set this to whatever maximum zoom level you prefer
            minZoom: 8   // Set the minimum zoom level to restrict how far users can zoom out
        }).locate({setView: true, maxZoom: 13});
    
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,  // Ensure the tile layer respects the maximum zoom level
            minZoom: 8,  // Ensure the tile layer respects the minimum zoom level
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(this.map);

        // Attach event listener for map movements
        this.map.on('moveend', this.reloadData);

        // Attach event listener for zoom changes
        this.map.on('zoomend', this.reloadData);

        // Initialize drawnItems feature group
        this.drawnItems = new L.FeatureGroup().addTo(this.map);

        // Initialize Draw control and add it to the map
        this.drawControl = new L.Control.Draw({
            draw: {
                rectangle: true,
                marker: true,
                polygon: false,
                polyline: false,
                circle: false,
                circlemarker: false
            },
            edit: {
                featureGroup: this.drawnItems,
                remove: false,
                edit: false
            }
        });
        this.map.addControl(this.drawControl);

        // Handle draw events
        this.map.on('draw:created', function(event) {
            var layer = event.layer;
            console.log(layer);
            if (layer instanceof L.Rectangle) {
                if (this.drawnRectangle) {
                    this.drawnItems.removeLayer(this.drawnRectangle);
                }
                this.drawnRectangle = layer;
                this.rectangle_coords = [this.drawnRectangle.getLatLngs()[0][0], this.drawnRectangle.getLatLngs()[0][2]];
                this.drawnItems.addLayer(layer);
            } else if (layer instanceof L.Marker) {
                if (this.placed_marker) {
                    this.drawnItems.removeLayer(this.placed_marker);
                }
                this.placed_marker = layer;
                this.marker_coords = this.placed_marker.getLatLng();
                this.drawnItems.addLayer(layer);
            }
            this.drawnItems.addLayer(layer);
            // Add the layer to the drawControl's editable feature group
            this.drawControl.options.edit.featureGroup.addLayer(layer);
        }.bind(this));

        // Add event listener for mouse movements on the map
        this.map.on('mousemove', function(event) {
            // Handle mouse movements here
            // You can add your logic for handling mouse movements after drawing here
        });
    },
};

app.vue = Vue.createApp(app.data).mount("#app");

app.load_data = function () {
    axios.get(get_species_url).then(function (r) {
        app.vue.species = r.data.species.map(species => ({ ...species, selected: false }));
    });
}

app.load_data();
