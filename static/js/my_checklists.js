"use strict";

let app = {};

// Declare the data.
app.data = {
    checklists: []
};

// Declare the methods.
app.methods = {
    fetchChecklists() {
        axios.get(get_checklists_url)
            .then(response => {
                this.checklists = response.data.checklists.map(checklist => {
                    return {
                        ...checklist,
                        showSightings: false
                    };
                });
            })
            .catch(error => {
                console.error("Error fetching checklists:", error);
            });
    },
    toggleSighting(checklist_id) {
        const checklist = this.checklists.find(c => c.checklist_id === checklist_id);
        if (checklist) {
            checklist.showSightings = !checklist.showSightings;
        }
    },
    deleteChecklist(checklist_id) {
        if (confirm("Are you sure you want to delete this checklist?")) {
            axios.post(`${delete_checklist_url}/${checklist_id}`)
                .then(response => {
                    if (response.data.status === 'success') {
                        this.checklists = this.checklists.filter(c => c.checklist_id !== checklist_id);
                        alert("Checklist deleted successfully");
                    } else {
                        alert(`Failed to delete checklist: ${response.data.message}`);
                    }
                })
                .catch(error => {
                    console.error("Error deleting checklist:", error);
                    alert("Failed to delete checklist.");
                });
        }
    },
    editChecklist(checklist_id) {
        axios.get(`${edit_checklist_url}/${checklist_id}`)
            .then(response => {
                if (response.data.status === 'success') {
                    const checklist = response.data.checklist;
                    localStorage.setItem('editChecklist', JSON.stringify(checklist));
                    window.location.href = "/cse-183-project/checklists";
                } else {
                    alert("Failed to load checklist for editing.");
                }
            })
            .catch(error => {
                console.error("Error loading checklist for editing:", error);
                alert("Failed to load checklist for editing.");
            });
    }
};

// Create Vue instance and mount it to the HTML element with id 'app'.
app.vue = Vue.createApp({
    data() {
        return app.data;
    },
    methods: app.methods,
    mounted() {
        this.fetchChecklists();
    }
}).mount("#app");
