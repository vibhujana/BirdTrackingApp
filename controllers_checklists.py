# Import necessary modules and setup URLSigner
from py4web import action, request, abort, redirect, URL
from yatl.helpers import A
from .common import db, session, T, cache, auth, logger, authenticated, unauthenticated, flash
from py4web.utils.url_signer import URLSigner
import datetime
import json

url_signer = URLSigner(session)

def get_user_email():
    return auth.current_user.get('email') if auth.current_user else None

def get_time():
    return datetime.datetime.utcnow()

def generate_id():
    last_checklist = db(db.checklists).select().last()
    if last_checklist:
        last_id = int(last_checklist.checklist_id[1:])  # Remove 'U' and convert to int
        new_id = f"U{last_id + 1:08d}"
    else:
        new_id = "U00000001"
    return new_id

def is_valid_date(date_str):
    try:
        datetime.datetime.strptime(date_str, '%Y-%m-%d')
        year = int(date_str.split('-')[0])
        if 1900 <= year <= 2100:
            return True
        return False
    except ValueError:
        return False

def is_valid_time(time_str):
    try:
        datetime.datetime.strptime(time_str, '%H:%M')
        return True
    except ValueError:
        return False

# API to submit a new checklist
@action('submit_checklist', method=['POST'])
@action.uses(db, auth.user)
def submit_checklist():
    data = request.json
    if not is_valid_date(data['dateObserved']):
        return dict(status='failed', message='Invalid date format. Please enter a valid date in YYYY-MM-DD format.')
    if not is_valid_time(data['timeObserved']):
        return dict(status='failed', message='Invalid time format. Please enter a valid time in HH:MM format.')
    
    checklist_id = generate_id()
    db.checklists.insert(
        checklist_id=checklist_id,
        latitude=data['latitude'],
        longitude=data['longitude'],
        date_observed=data['dateObserved'],
        time_observed=data['timeObserved'],
        user_email=get_user_email()
    )
    for sighting in data['sightings']:
        if sighting['count'] <= 0:
            return dict(status='failed', message='Sighting counts must be greater than 0.')
        db.sightings.insert(
            checklist_id=checklist_id,
            species_name=sighting['speciesName'],
            count=sighting['count']
        )
    return dict(status='success')

# API to get user's checklists
@action('get_checklists')
@action.uses(db, auth.user)
def get_checklists():
    checklists = db(db.checklists.user_email == get_user_email()).select().as_list()
    for checklist in checklists:
        sightings = db(db.sightings.checklist_id == checklist['checklist_id']).select().as_list()
        checklist['sightings'] = sightings
    return dict(checklists=checklists)

# API to edit a checklist
@action('edit_checklist/<checklist_id>', method=['GET', 'POST'])
@action.uses(db, auth.user)
def edit_checklist(checklist_id):
    checklist = db(db.checklists.checklist_id == checklist_id).select().first()
    if not checklist or checklist.user_email != get_user_email():
        return dict(status='failed', message='Checklist not found or user not authorized.')
    
    if request.method == 'POST':
        data = request.json
        if not is_valid_date(data['dateObserved']):
            return dict(status='failed', message='Invalid date format. Please enter a valid date in YYYY-MM-DD format.')
        if not is_valid_time(data['timeObserved']):
            return dict(status='failed', message='Invalid time format. Please enter a valid time in HH:MM format.')

        checklist.update_record(
            latitude=data['latitude'],
            longitude=data['longitude'],
            date_observed=data['dateObserved'],
            time_observed=data['timeObserved']
        )
        db(db.sightings.checklist_id == checklist_id).delete()
        for sighting in data['sightings']:
            db.sightings.insert(
                checklist_id=checklist_id,
                species_name=sighting['speciesName'],
                count=sighting['count']
            )
        return dict(status='success')

    # Return the checklist data for GET requests
    sightings = db(db.sightings.checklist_id == checklist_id).select().as_list()
    checklist_data = checklist.as_dict()
    checklist_data['sightings'] = sightings
    return dict(status='success', checklist=checklist_data)


# API to delete a checklist
@action('delete_checklist/<checklist_id>', method='POST')
@action.uses(db, auth.user)
def delete_checklist(checklist_id):
    print(f"Attempting to delete checklist with ID: {checklist_id}")  # Debug print statement
    checklist = db(db.checklists.checklist_id == checklist_id).select().first()
    if not checklist:
        print("Checklist not found.")  # Debug print statement
        return dict(status='failed', message='Checklist not found.')
    if checklist.user_email != get_user_email():
        print("User not authorized.")  # Debug print statement
        return dict(status='failed', message='User not authorized.')
    db(db.sightings.checklist_id == checklist_id).delete()
    checklist.delete_record()
    print("Checklist deleted successfully.")  # Debug print statement
    return dict(status='success')


# API to add a sighting
@action('add_sighting', method='POST')
@action.uses(db, auth.user)
def add_sighting():
    data = request.json
    db.sightings.insert(
        checklist_id=data['checklistId'],
        species_name=data['speciesName'],
        count=data['count']
    )
    return dict(status='success')

# API to remove a sighting
@action('remove_sighting', method='POST')
@action.uses(db, auth.user)
def remove_sighting():
    data = request.json
    db(db.sightings.checklist_id == data['checklistId'] and db.sightings.species_name == data['speciesName']).delete()
    return dict(status='success')

# Route to render checklist.html
@action('checklists')
@action.uses('checklists.html', db, auth.user)
def checklists():
    return dict(
        get_species_url=URL('get_species'),
        submit_checklist_url=URL('submit_checklist')
    )

# Route to render my_checklists.html
@action('my_checklists')
@action.uses('my_checklists.html', db, auth.user)
def my_checklists():
    return dict(
        get_checklists_url=URL('get_checklists'),
        edit_checklist_url=URL('edit_checklist'),
        delete_checklist_url=URL('delete_checklist')
    )
