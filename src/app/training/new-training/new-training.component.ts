import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpService } from 'src/app/httpService';
import { RawGroup, RawLocation, RawTraining } from 'src/app/types';
import { formatFullDate, formatHourDate } from 'src/app/utils';

@Component({
    selector: 'app-new-training',
    templateUrl: './new-training.component.html',
    styleUrls: ['./new-training.component.scss']
})
export class NewTrainingComponent implements OnInit {
    locations: RawLocation[] = [];
    selectedLocationId = 0;
    groups: RawGroup[] = [];
    loadedGroupIds: number[] = [];
    selectedGroups: number[] = [];
    selectedType = '';
    isPublic = false;
    trainingTypes: string[] = ['Off Ice', 'Ice', 'Ballet'];
    mode = 'new';
    displayDate: Date = new Date();
    startHour: Date = new Date();
    endHour: Date = new Date();

    dateControl = new FormControl();
    startTimeControl = new FormControl();
    endTimeControl = new FormControl();
    groupControl = new FormControl();

    formatFullDate = formatFullDate;

    constructor(
        private http: HttpService,
        public dialogRef: MatDialogRef<NewTrainingComponent>,
        @Inject(MAT_DIALOG_DATA) public data: RawTraining,
    ) { }
    ngOnInit(): void {
        this.loadLocations();
        this.loadGroups();
        if (this.data) {
            this.mode = 'edit';
            this.selectedLocationId = this.data.location.id;
            this.displayDate = new Date(this.data.startTime);
            this.startHour = this.data.startTime;
            this.isPublic = this.data.isPublic;
            this.endHour = this.data.endTime;
            this.selectedType = this.data.type;
            this.data.groups.forEach( group => {
                this.selectedGroups.push( group.id);
                this.loadedGroupIds.push( group.id );
            });
            this.groupControl.setValue(this.selectedGroups);
        }
        this.initControls();
    }
    initControls(): void {
        this.dateControl = new FormControl(this.displayDate, Validators.required);
        this.startTimeControl = new FormControl(formatHourDate(this.startHour), Validators.required);
        this.endTimeControl = new FormControl(formatHourDate(this.endHour), Validators.required);
    }
    async loadLocations(): Promise<void> {
        this.locations = await this.http.get<RawLocation[]>('location');
    }
    async loadGroups(): Promise<void> {
        this.groups = await this.http.get<RawGroup[]>('group');
    }
    async saveTraining(): Promise<void> {
        if (this.mode === 'new') {
            await this.saveNewTraining();
        }
        else {
            await this.updateTraining();
        }
    }
    async saveNewTraining(): Promise<void> {
        const newTraining = await this.http.post<RawTraining>('training/new', {
            locationId: this.selectedLocationId,
            rawTrainingData: {
                startTime: new Date(formatFullDate(this.dateControl.value) + ' ' + this.startTimeControl.value),
                endTime: new Date(formatFullDate(this.dateControl.value) + ' ' + this.endTimeControl.value),
                type: this.selectedType,
                isPublic: this.isPublic,
                applications: '',
            }
        });
        for (const groupId of this.selectedGroups) {
            await this.http.post<{}>('training/addGroup', {
                groupId,
                trainingId: newTraining.id
            });
        }
        this.dialogRef.close({ refreshNeeded: true });
    }
    async updateTraining(): Promise<void> {
        await this.http.post<{}>('training/modify', {
            locationId: this.selectedLocationId,
            rawTrainingData: {
                id: this.data.id,
                startTime: new Date(formatFullDate(this.dateControl.value) + ' ' + this.startTimeControl.value),
                endTime: new Date(formatFullDate(this.dateControl.value) + ' ' + this.endTimeControl.value),
                type: this.selectedType,
                isPublic: this.isPublic,
            }
        });
        const removedGroups = this.loadedGroupIds.filter( id => !this.selectedGroups.includes(id));
        const addedGroups = this.selectedGroups.filter( id => !this.loadedGroupIds.includes(id));
        for (const groupId of addedGroups) {
            await this.http.post<RawGroup>('training/addGroup', {
                groupId,
                trainingId: this.data.id
            });
        }
        for (const groupId of removedGroups) {
            await this.http.post<RawGroup>('training/removeGroup', {
                groupId,
                trainingId: this.data.id
            });
        }
        this.dialogRef.close({ refreshNeeded: true });
    }
    cancel(): void {
        this.dialogRef.close({ refreshNeeded: false });
    }
}
