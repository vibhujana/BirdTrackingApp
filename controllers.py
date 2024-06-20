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


@action('index')
@action.uses('index.html', db, auth.user)
def index():
    return dict(
        heatmap_url = URL('heatmap'),
        get_species_url = URL('get_species'),
        
    )

@action('heatmap')
@action.uses(db, auth.user)
def heatmap():
    # Get bounding box coordinates from the request
    bounds = request.query.get('bounds')
    selected_species = request.query.get('selected_species')

    # Base query
    query = (db.sightings.checklist_id == db.checklists.checklist_id)

    # Add species filter if selected_species is provided
    if selected_species:
        query &= (db.sightings.species_name == selected_species)

    if bounds:
        # Parse the bounds string (format: "lat1,lng1,lat2,lng2")
        lat1, lng1, lat2, lng2 = map(float, bounds.split(','))
        # Add bounding box filter
        query &= (db.checklists.latitude >= lat1) & (db.checklists.latitude <= lat2) & \
                 (db.checklists.longitude >= lng1) & (db.checklists.longitude <= lng2)

    # Execute the query
    species_data = db(query).select(
        db.checklists.latitude, db.checklists.longitude, db.sightings.count,
        join=db.checklists.on(db.sightings.checklist_id == db.checklists.checklist_id)).as_list()

    return dict(species_data=species_data)

@action('get_species')
@action.uses(db, auth.user)
def get_species():
    species = db(db.species).select(db.species.species_name).as_list()
    return dict(species=species)


