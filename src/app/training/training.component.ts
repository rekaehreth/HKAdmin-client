import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../auth.service';
import { HttpService } from '../httpService';
import { RawTraining } from '../types';
import { formatFullDate, formatHourDate } from '../utils';
import { NewTrainingComponent } from './new-training/new-training.component';

@Component({
    selector: 'app-training',
    templateUrl: './training.component.html',
    styleUrls: ['./training.component.scss']
})

export class TrainingComponent implements OnInit {
    colNum = 5;
    trainings: {training: RawTraining, subscribedForTraining: boolean}[] = [];
    roles: string[] = [];

    formatFullDate = formatFullDate;
    formatHourDate = formatHourDate;
    constructor(
        private http: HttpService,
        public dialog: MatDialog,
        private authService: AuthService,
    ) {
        this.authService.loginStatusChange.subscribe( _ => { this.loadTrainings(); });
    }
    ngOnInit(): void {
        this.loadTrainings().then(_ => this.roles = this.authService.getLoggedInRoles());
    }
    async loadTrainings(): Promise<void> {
        const userId = this.authService.getLoggedInUserId();
        if (userId === -1){
            this.trainings = (await this.http.get<RawTraining[]>('training/listPublic'))
                .map(training => ({training, subscribedForTraining: false}));
        }else{
            this.trainings  = await this.http.get<{training: RawTraining, subscribedForTraining: boolean}[]>
                (`user/listAvailableTrainings/${userId}`);
        }
        if (this.trainings.length !== 0 ){
            this.trainings = this.trainings.filter( training => {
                return new Date() <= new Date(training.training.endTime);
            });
            this.trainings.sort((
                    a: {training: RawTraining, subscribedForTraining: boolean},
                    b: {training: RawTraining, subscribedForTraining: boolean}
                ) => {
                if (a.training.startTime === b.training.startTime) {
                    return 0;
                }
                if (a.training.startTime > b.training.startTime) {
                    return 1;
                }
                return -1;
            });
        }
    }
    setColNum(): boolean {
            const screenWidth = window.innerWidth;
            this.colNum = screenWidth / 360 >= 1 ? screenWidth / 360 : 1;

            return true;
    }
    openNewTrainingDialog(): void {
        const dialogRef = this.dialog.open(NewTrainingComponent, {
            width: '50vw',
            disableClose: true,
        });
        dialogRef.afterClosed().subscribe(result => {
            console.log('New training dialog closed ', result);
            if (result.refreshNeeded) {
                this.loadTrainings();
            }
        });
    }
}
