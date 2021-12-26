import { Component, Input, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-location',
  templateUrl: './location.component.html',
  styleUrls: ['./location.component.scss']
})

export class LocationComponent implements OnInit {
  @Input()
  locationId = 0;
  name = '';
  capacity = 0;
  minAttendees = 0;
  trainingIds: number[] = [];
  constructor( private http: HttpClient ) { }

  ngOnInit(): void {
    this.loadLocation();
  }

  async loadLocation(): Promise<void> {
    const locationObj = await this.http.get<RawLocation>( `https://hkadmin-api.icescream.net/location/${this.locationId}` ).toPromise();
    this.name = locationObj.name;
    this.capacity = locationObj.capacity;
    this.minAttendees = locationObj.min_attendees;
    this.trainingIds = locationObj.trainings.map( training => training.id);
  }
}

type RawLocation = {
  id: number,
  name: string,
  capacity: number,
  min_attendees: number,
  trainings: any[],
};
