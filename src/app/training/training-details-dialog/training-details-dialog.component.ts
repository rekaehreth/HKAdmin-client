import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import * as mapboxgl from 'mapbox-gl';
import OpenLocationCode, { CodeArea } from 'open-location-code-typescript';
import { AuthService } from 'src/app/auth.service';
import { HttpService } from 'src/app/httpService';
import { Application, RawGroup, RawTraining, RawUser } from 'src/app/types';
import { findUserInApplications, formatFullDate, formatHourDate } from 'src/app/utils';
import { environment } from 'src/environments/environment';
import { ManageTrainingFinancesDialogComponent } from './manage-training-finances-dialog/manage-training-finances-dialog.component';

@Component({
    selector: 'app-training-details-dialog',
    templateUrl: './training-details-dialog.component.html',
    styleUrls: ['./training-details-dialog.component.scss']
})
export class TrainingDetailsDialogComponent implements OnInit {
    // MAP
    map!: mapboxgl.Map;
    googleMapsLink = '';
    style = 'mapbox://styles/mapbox/streets-v11';
    latitude = 37.75;
    longitude = -122.41;
    plus_code = '';

    // DATA
    groups: {rawGroup: RawGroup, numOfTrainees: number, numOfCoaches: number, userApplied: boolean}[] = [];
    applications: Application[] = [];
    roles: string[] = [];
    registeredGroupId = -1;

    // ACCORDION
    disableAnimation = true;

    // TABLE
    displayedTrainees: RawUser[] = [];
    traineeDataSource = new MatTableDataSource<RawUser>();
    displayedCoaches: RawUser[] = [];
    coachDataSource = new MatTableDataSource<RawUser>();
    displayedColumns: string[] = ['name', 'actions'];


    formatFullDate = formatFullDate;
    formatHourDate = formatHourDate;

    constructor(
        public dialogRef: MatDialogRef<TrainingDetailsDialogComponent>,
        private http: HttpService,
        public authService: AuthService,
        public dialog: MatDialog,
        @Inject(MAT_DIALOG_DATA) public data: RawTraining) { }

    ngOnInit(): void {
            (mapboxgl as any).accessToken = environment.mapbox.accessToken;
            this.setCoordinates();
            this.map = new mapboxgl.Map({
            container: 'map',
            style: this.style,
            zoom: 13,
            center: [this.longitude, this.latitude]
        });
            new mapboxgl.Marker().setLngLat([this.longitude, this.latitude]).addTo(this.map);
            this.initContainers().then();
    }
    async initContainers(): Promise<void> {
        this.groups = [];
        this.applications = [];
        this.registeredGroupId = -1;

        const userId = this.authService.getLoggedInUserId();
        this.roles = this.authService.getLoggedInRoles();
        const user = await this.http.get<RawUser>(`user/${userId}`);
        const userGroups = this.data.groups.filter( group => {
            return this.roles.includes('admin') || user.groups.includes(group);
        } );
        this.applications = await this.http.get<Application[]>(`training/getApplications/${this.data.id}`);
        userGroups.map( group => {
            const numOfTrainees = this.applications.filter( application => application.role === 'trainee').length;
            const numOfCoaches = this.applications.filter( application => application.role === 'coach').length;
            const userApplied = this.applications.filter( application => application.userId  === userId).length > 0;
            this.groups.push({rawGroup: group, numOfTrainees, numOfCoaches, userApplied});
        });
        const userIdx = findUserInApplications(userId, this.applications);
        if ( userIdx > -1 ) {
            this.registeredGroupId = this.applications[userIdx].groupId;
        }
    }
    setCoordinates(): void {
        this.plus_code = OpenLocationCode.recoverNearest( this.data.location.plus_code, 47.49622, 19.04588 );
        const location: CodeArea = OpenLocationCode.decode(this.plus_code);
        this.latitude = location.latitudeCenter;
        this.longitude = location.longitudeCenter;
        this.googleMapsLink = `https://www.google.com/maps/search/${this.latitude},${this.longitude}`;
    }
    navigateToGoogleMaps(): void {
        window.open(this.googleMapsLink, '_blank')?.focus();
    }
    openAdministrateTrainingDialog(): void {
        this.dialog.open(ManageTrainingFinancesDialogComponent, {
            width: '50vw',
            data: this.data,
        });
    }
}
