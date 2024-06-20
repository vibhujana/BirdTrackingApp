# Import necessary modules and setup URLSigner
from py4web import action, request, abort, redirect, URL
from yatl.helpers import A
from .common import db, session, T, cache, auth, logger, authenticated, unauthenticated, flash
from py4web.utils.url_signer import URLSigner
import datetime
import json

url_signer = URLSigner(session)

@action('location')
@action.uses('location.html', db, auth.user)
def location():    
    return dict(
        get_species_url = URL('get_species'),
        get_location_checklists_url = URL('get_location_checklists'),
        get_sightings_url = URL('get_sightings'),
        get_checklists_in_region_url = URL('get_checklists_in_region'),
        get_sightings_in_checklist_url = URL('get_sightings_in_checklist')
    )

@action('get_location_checklists')
@action.uses(db, auth.user)
def get_location_checklists():
    checklists = db(db.checklists).select().as_list()
    return dict(checklists=checklists)

@action('get_sightings', method=['POST'])
@action.uses(db, auth.user)
def get_sightings():
    location_checklists_filtered = request.json
    checklist_ids = [checklist['checklist_id'] for checklist in location_checklists_filtered]
    sightings = db(db.sightings.checklist_id.belongs(checklist_ids)).select().as_list()
    return dict(sightings=sightings)

@action('get_checklists_in_region')
@action.uses(db, auth.user)
def get_checklists_in_region():
    lat1 = request.query.get('lat1')
    long1 = request.query.get('long1')
    lat2 = request.query.get('lat2')
    long2 = request.query.get('long2')
    checklists = db(
        (db.checklists.latitude >= lat1) & (db.checklists.latitude <= lat2) &
        (db.checklists.longitude >= long1) & (db.checklists.longitude <= long2)
    ).select().as_list()
    # Return the checklist objects in the region
    return dict(checklists=checklists)

@action('get_sightings_in_checklist')
@action.uses(db, auth.user)
def get_sightings_in_checklist():
    checklist_id = request.query.get('checklist_id')
    sightings = db(db.sightings.checklist_id == checklist_id).select().as_list()
    return dict(sightings=sightings)    # Return the sightings in the checklist
