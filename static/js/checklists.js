"use strict";

// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};

// Declare the data.
app.data = {
    speciesQuery: '',
    speciesList: [],
    newChecklist: {
        latitude: localStorage.getItem('lat') || '',
        longitude: localStorage.getItem('lng') || '',
        dateObserved: '',
        timeObserved: '',
        sightings: [],
        isEditing: false,  // Add a flag to check if we are editing a checklist
        checklistId: null
    },
    filteredSpecies: []
};

// Declare the methods.
app.methods = {
    populateChecklist() {
        const editChecklist = localStorage.getItem('editChecklist');
        if (editChecklist) {
            const checklist = JSON.parse(editChecklist);
            this.newChecklist.latitude = checklist.latitude;
            this.newChecklist.longitude = checklist.longitude;
            this.newChecklist.dateObserved = checklist.date_observed;
            this.newChecklist.timeObserved = checklist.time_observed.slice(0, 5); // Ensure HH:MM format
            this.newChecklist.sightings = checklist.sightings.map(sighting => {
                const species = this.speciesList.find(s => s.species_name === sighting.species_name);
                if (species) {
                    species.count = sighting.count;
                }
                return {
                    speciesName: sighting.species_name,
                    count: sighting.count
                };
            });

            this.newChecklist.isEditing = true; // Set the flag to true
            this.newChecklist.checklistId = checklist.checklist_id; // Store the checklist ID

            localStorage.removeItem('editChecklist');
        }
    },
    searchSpecies() {
        this.filteredSpecies = this.speciesList.filter(species =>
            species.species_name.toLowerCase().includes(this.speciesQuery.toLowerCase())
        );
    },
    incrementCount(species) {
        species.count = (species.count || 0) + 1;
        this.updateSightings(species);
    },
    decrementCount(species) {
        if (species.count > 0) {
            species.count -= 1;
        }
        this.updateSightings(species);
    },
    updateCount(species, count) {
        species.count = count;
        this.updateSightings(species);
    },
    updateSightings(species) {
        const existingSighting = this.newChecklist.sightings.find(
            sighting => sighting.speciesName === species.species_name
        );
        if (existingSighting) {
            existingSighting.count = species.count;
        } else if (species.count > 0) {
            this.newChecklist.sightings.push({ speciesName: species.species_name, count: species.count });
        }
        this.newChecklist.sightings = this.newChecklist.sightings.filter(sighting => sighting.count > 0);
    },
    removeSighting(sighting) {
        const index = this.newChecklist.sightings.indexOf(sighting);
        if (index > -1) {
            this.newChecklist.sightings.splice(index, 1);
        }
        const species = this.speciesList.find(species => species.species_name === sighting.speciesName);
        if (species) {
            species.count = 0;
        }
    },
    validateDate(dateString) {
        const date = new Date(dateString);
        const year = dateString.split('-')[0];
        return date instanceof Date && !isNaN(date) && year >= 1900 && year <= 2100;
    },
    validateTime(timeString) {
        const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return regex.test(timeString);
    },
    validateCount() {
        if (this.newChecklist.sightings.length === 0) {
            return false;
        }
        for (let sighting of this.newChecklist.sightings) {
            if (!Number.isInteger(sighting.count) || sighting.count <= 0) {
                return false;
            }
        }
        return true;
    },
    submitChecklist() {
        if (!this.validateDate(this.newChecklist.dateObserved)) {
            alert('Please enter a valid date.');
            return;
        }
        if (!this.validateTime(this.newChecklist.timeObserved)) {
            alert('Please enter a valid time.');
            return;
        }
        if (!this.validateCount()) {
            alert('Please enter a valid count for each sighting.');
            return;
        }

        const submitUrl = this.newChecklist.isEditing 
            ? `${edit_checklist_url}/${this.newChecklist.checklistId}` 
            : submit_checklist_url;

        axios.post(submitUrl, this.newChecklist)
            .then(response => {
                if (response.data.status === 'success') {
                    alert('Checklist submitted successfully');
                    window.location.href = "/cse-183-project"; // Redirect to index page
                }
            });
    },
    resetForm() {
        this.newChecklist = {
            latitude: localStorage.getItem('lat') || '',
            longitude: localStorage.getItem('lng') || '',
            dateObserved: '',
            timeObserved: '',
            sightings: [],
            isEditing: false,  // Reset the flag
            checklistId: null
        };
        this.speciesQuery = '';
        this.filteredSpecies = this.speciesList;
    }
};

// Create Vue instance and mount it to the HTML element with id 'app'.
app.vue = Vue.createApp({
    data() {
        return app.data;
    },
    methods: app.methods,
    mounted() {
        axios.get(get_species_url)
            .then(response => {
                this.speciesList = response.data.species;
                this.filteredSpecies = this.speciesList;
                this.populateChecklist(); // Populate the checklist after loading species list
            });
    }
}).mount("#app");