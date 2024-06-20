"""
This file defines actions, i.e. functions the URLs are mapped into
The @action(path) decorator exposed the function at URL:

    http://127.0.0.1:8000/{app_name}/{path}

If app_name == '_default' then simply

    http://127.0.0.1:8000/{path}

If path == 'index' it can be omitted:

    http://127.0.0.1:8000/

The path follows the bottlepy syntax.

@action.uses('generic.html')  indicates that the action uses the generic.html template
@action.uses(session)         indicates that the action uses the session
@action.uses(db)              indicates that the action uses the db
@action.uses(T)               indicates that the action uses the i18n & pluralization
@action.uses(auth.user)       indicates that the action requires a logged in user
@action.uses(auth)            indicates that the action requires the auth object

session, db, T, auth, and tempates are examples of Fixtures.
Warning: Fixtures MUST be declared with @action.uses({fixtures}) else your app will result in undefined behavior
"""

from py4web import action, request, abort, redirect, URL
from yatl.helpers import A
from .common import db, session, T, cache, auth, logger, authenticated, unauthenticated, flash
from py4web.utils.url_signer import URLSigner
from .models import get_user_email

# Create a URLSigner instance using the session for signing URLs
url_signer = URLSigner(session)

@action('userstats')
@action.uses('user_stats.html', db, auth.user)
def userstats():
    # This function serves the user statistics page and provides URLs
    # for fetching user data, bird click data, and chart data.
    return dict(
        get_userdata_url = URL('get_userdata'),
        click_bird_url = URL('click_bird'),
        get_chart_data_url = URL('get_chart_data')
    )

@action('get_userdata')
@action.uses(db, auth.user)
def get_userdata():
    # This function returns user-specific data, including the species
    # observed by the user and the most recent date and time each species was observed.
    user_email = get_user_email()
    
    # Get all checklist IDs for the current user
    checklists = db(db.checklists.user_email == user_email).select(db.checklists.checklist_id).as_list()
    checklist_ids = [item['checklist_id'] for item in checklists]

    # Join sightings with checklists to get the species name and the date observed
    species_with_dates = db(
        (db.sightings.checklist_id.belongs(checklist_ids)) &
        (db.sightings.checklist_id == db.checklists.checklist_id)
    ).select(
        db.sightings.species_name,
        db.checklists.date_observed,
        db.checklists.time_observed,
        orderby=~db.checklists.date_observed | ~db.checklists.time_observed,
    ).as_list()

    # Find the most recent date each species was seen
    species_date_map = {}
    for record in species_with_dates:
        species = record['sightings']['species_name']
        date_observed = record['checklists']['date_observed']
        time_observed = record['checklists']['time_observed']
        if species not in species_date_map:
            species_date_map[species] = {"date": date_observed, "time": time_observed}

    # Prepare the result
    species_info = [{'species_name': species, 'most_recent_date': value["date"], "time": value["time"]} for species, value in species_date_map.items()]
    return dict(species_info=species_info, current_user=user_email)

@action('click_bird')
@action.uses(db, auth.user)
def click_bird():
    # This function returns the sightings data for a specific bird species
    # observed by the current user.
    user_email = get_user_email()
    bird_species = request.query.get('bird_species')
    
    # Define the query to get the sightings data for the specified bird species
    query = (db.checklists.checklist_id == db.sightings.checklist_id) & \
            (db.checklists.user_email == user_email) & \
            (db.sightings.species_name == bird_species)

    # Execute the query and get the data
    sightings_data = db(query).select(
        db.checklists.date_observed,
        db.checklists.latitude,
        db.checklists.longitude,
        db.sightings.count
    ).as_list()
    
    # Print the sightings data to the console (for debugging)
    print(sightings_data)
    
    return dict(sightings_data=sightings_data)

@action('get_chart_data')
@action.uses(db, auth.user)
def get_chart_data():
    # This function returns the data needed to render a chart of total bird
    # sightings over time for the current user.
    user_email = get_user_email()
    
    # Define the query to get the total bird sightings data grouped by date
    query = (db.sightings.checklist_id == db.checklists.checklist_id) & (db.checklists.user_email == user_email)
    rows = db(query).select(
        db.checklists.date_observed,
        db.sightings.count.sum().with_alias('total_birds'),
        groupby=db.checklists.date_observed
    )
    
    # Prepare the result
    result = []
    for row in rows:
        result.append({
            'date_observed': row.checklists.date_observed,
            'total_birds': row.total_birds
        })

    return dict(result=result)
