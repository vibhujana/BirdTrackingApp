"""
This file defines the database models
"""

import datetime
import csv
from .common import db, Field, auth
from pydal.validators import *


def get_user_email():
    return auth.current_user.get('email') if auth.current_user else None

def get_time():
    return datetime.datetime.utcnow()


### Define your table below
#
# db.define_table('thing', Field('name'))
#
## always commit your models to avoid problems later
db.define_table('species',
                Field('species_name', 'string'),
            )
if db(db.species).isempty():
    with open('species.csv', 'r') as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            db.species.insert(species_name=row[0])
db.define_table('sightings',
                Field('checklist_id', 'string'),
                Field('species_name', 'string'),
                Field('count', 'integer'),
            )

if db(db.sightings).isempty():
    with open('sightings.csv', 'r') as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            try:
                observation_count = int(row[2])
            except ValueError:
                observation_count = 0
            db.sightings.insert(checklist_id=row[0], species_name=row[1], count=observation_count)

db.define_table('checklists',
                Field('checklist_id', 'string'),
                Field('latitude', 'double'),
                Field('longitude', 'double'),
                Field('date_observed', 'date'),
                Field('time_observed', 'time'),
                Field('user_email', 'string'),
                Field('duration_minutes', 'double'),
            )
if db(db.checklists).isempty():
    with open('checklists.csv', 'r') as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            db.checklists.insert(checklist_id=row[0], latitude=row[1], longitude=row[2], date_observed=row[3], time_observed=row[4], user_email=row[5], duration_minutes=row[6])

db.commit()
