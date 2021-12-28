import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TooltipPosition } from '@angular/material/tooltip';
import { AuthService } from 'src/app/auth.service';
import { ConfirmDialogComponent } from 'src/app/confirm-dialog/confirm-dialog.component';
import { HttpService } from 'src/app/httpService';
import {Application, RawCoach, RawGroup, RawTraining, RawUser} from 'src/app/types';
import {findUserInApplications, formatFullDate, formatHourDate} from 'src/app/utils';
import { NewTrainingComponent } from '../new-training/new-training.component';
import { TrainingDetailsDialogComponent } from '../training-details-dialog/training-details-dialog.component';
import {MatSnackBar} from '@angular/material/snack-bar';
import {RegisterGuestDialogComponent} from '../training-details-dialog/register-guest-dialog/register-guest-dialog.component';
import {RegisterTrainingDialogComponent} from './register-training-dialog/register-training-dialog.component';
import {ManageTrainingFinancesDialogComponent} from '../training-details-dialog/manage-training-finances-dialog/manage-training-finances-dialog.component';

@Component({
    selector: 'app-training-card',
    templateUrl: './training-card.component.html',
    styleUrls: ['./training-card.component.scss']
})
export class TrainingCardComponent implements OnInit {
    @Input()
    trainingData!: {training: RawTraining, subscribedForTraining: boolean};
    roles: string[] = [];
    tooltipPosition: TooltipPosition = 'above';
    trainingAvailable = true;
    traineeGroups: RawGroup[] = [];
    coachGroups: RawGroup[] | undefined = [];
    formatFullDate = formatFullDate;
    formatHourDate = formatHourDate;

    @Output()
    refreshTrainings: EventEmitter<string> = new EventEmitter();

    constructor(
        private http: HttpService,
        public dialog: MatDialog,
        private authService: AuthService,
        private snackBar: MatSnackBar,
    ) { }
    ngOnInit(): void {
        this.roles = this.authService.getLoggedInRoles();
        this.http.get<RawUser>(`user/${this.authService.getLoggedInUserId()}`).then(async (user) => {
            const coach = await this.http.get<RawCoach>(`coach/getByUserId/${this.authService.getLoggedInUserId()}`);
            this.traineeGroups = this.getAvailableGroupsForTraining(user);
            this.coachGroups = coach !== undefined && coach !== null ? this.getAvailableGroupsForTraining(coach) : undefined;
            this.trainingAvailable = (this.traineeGroups.length > 0 || (this.coachGroups !== undefined && this.coachGroups.length > 0)) ||
                (!this.authService.isLoggedIn()) ;
        });

    }
    openEditTrainingDialog(): void {
        const dialogRef = this.dialog.open(NewTrainingComponent, {
            width: '50vw',
            data: this.trainingData.training
        });
        dialogRef.afterClosed().subscribe(async result => {
            if (result && result.refreshNeeded) {
                this.refreshTrainings.emit('update');
            }
        });
    }
    deleteTraining(): void {
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            width: '50vw',
            data: 'Do you really want to delete this training?',
            disableClose: true,
        });
        dialogRef.afterClosed().subscribe(async result => {
            if (result.result === 'confirm') {
                await this.http.delete(`training/${this.trainingData.training.id}`);
                this.refreshTrainings.emit('update');
            }
        });
    }
    openDetailDialog(): void {
        this.dialog.open(TrainingDetailsDialogComponent, {
            width: '60vw',
            data: this.trainingData.training,
        });
    }
    async signUpForTraining(): Promise<void> {
        const loggedInRoles = this.authService.getLoggedInRoles();
        if ( loggedInRoles.includes('guest') ){
            await this.addGuestToTraining();
        }
        else{
            if ( this.traineeGroups.length === 1 && (this.coachGroups === undefined || this.coachGroups.length === 0)){
                await this.addTraineeToTraining(this.traineeGroups[0].id);
            }else if (this.traineeGroups.length === 0 && this.coachGroups?.length === 1){
                await this.registerCoach(this.coachGroups[0].id);
            }else{
                const dialogRef = this.dialog.open(RegisterTrainingDialogComponent, {
                    data: { traineeGroups : this.traineeGroups, coachGroups: this.coachGroups}
                });
                dialogRef.afterClosed().subscribe(async result => {
                    if (result) {
                        if (result.role === 'Trainee') {
                            await this.addTraineeToTraining(result.groupId);
                        } else if (result.role === 'Coach') {
                            await this.registerCoach(result.groupId);
                        }
                    } else {
                        this.snackBar.open('Registration cancelled', 'OK', {duration: 3000});
                    }
                });
            }
        }
    }

    getAvailableGroupsForTraining(user: RawUser |RawCoach ): RawGroup[] {
        if (!this.authService.isLoggedIn()){
            return [];
        }
        return user.groups.filter(
            group => this.trainingData.training.groups.find(
                trainingGroup => trainingGroup.id === group.id) !== undefined
        );
    }
    async revokeApplication(): Promise<void> {
        await this.deregisterUser();
        this.refreshTrainings.emit('update');
    }

    async addTraineeToTraining(groupId: number): Promise<void> {
        const userId = this.authService.getLoggedInUserId();
        const user = await this.http.get<RawUser>(`user/${userId}`);
        await this.http.post<{}>('user/addTraineeToTraining', {
            userId,
            groupId,
            trainingId: this.trainingData.training.id
        });
        const amount: number = (-1) * 4000;
        await this.http.post<{}>('finance/new', {
            userId,
            trainingId: this.trainingData.training.id,
            rawPaymentData: {
                amount,
                time: new Date(),
                status: 'pending',
                description: `Training ${user.name} ${user.email}, ${this.trainingData.training.location.name} ${formatFullDate(this.trainingData.training.startTime)} ${formatHourDate(this.trainingData.training.startTime)}-${formatHourDate(this.trainingData.training.endTime)}`
            }
        });
        this.snackBar.open('Registration successful', 'OK', { duration: 3000});

        this.refreshTrainings.emit('update');
        // **TODO** Handle time differences --> 50 mins - 4000, 110 min - 8000,
        // **TODO** Handle fix wage / training vs. fix wage per capita
    }
    async addGuestToTraining(): Promise<void> {
        let user!: RawUser;
        const dialogRef = this.dialog.open(RegisterGuestDialogComponent, {
            width: '50vw',
            disableClose: true,
        });
        dialogRef.afterClosed().subscribe(async result => {
            const learnToSkate = await this.http.get<RawGroup>(`group/findByName/Learn to skate`);
            if (result.action === 'save') {
                user = result.user;
                await this.http.post<{}>('user/addTraineeToTraining', {
                    userId: user.id,
                    groupId: learnToSkate.id,
                    trainingId: this.trainingData.training.id
                });
                const amount: number = (-1) * 4000;
                await this.http.post<{}>('finance/new', {
                    userId: user.id,
                    rawPaymentData: {
                        amount,
                        time: this.trainingData.training.startTime,
                        status: 'pending',
                        description: `Training ${user.name} ${user.email}, ${this.trainingData.training.location.name} ${formatFullDate(this.trainingData.training.startTime)} ${formatHourDate(this.trainingData.training.startTime)}`
                    }
                });
                this.snackBar.open('Registration successful', 'OK', { duration: 3000});
                this.refreshTrainings.emit('update');
            }
            else {
                this.snackBar.open('Registration cancelled', 'OK', { duration: 3000});
            }
        });
    }
    async registerCoach(groupId: number): Promise<void> {
        const userId = this.authService.getLoggedInUserId();
        await this.http.post<{}>('user/addCoachToTraining', {
            userId,
            groupId,
            trainingId: this.trainingData.training.id
        });
        const coach = await this.http.get<RawCoach>(`user/getCoach/${userId}`);
        await this.http.post<{}>('finance/new', {
            userId,
            trainingId: this.trainingData.training.id,
            rawPaymentData: {
                amount: coach.wage,
                time: new Date(),
                status: 'pending',
                description: `Coaching ${coach.user.name} ${coach.user.email}, ${this.trainingData.training.location.name} ${formatFullDate(this.trainingData.training.startTime)} ${formatHourDate(this.trainingData.training.startTime)}-${formatHourDate(this.trainingData.training.endTime)}`
            }
        });
        this.snackBar.open('Registration successful', 'OK', { duration: 3000});

        this.refreshTrainings.emit('update');
    }
    async deregisterUser(): Promise<void> {
        const applications = await this.http.get<Application[]>(`training/getApplications/${this.trainingData.training.id}`);
        const userId = this.authService.getLoggedInUserId();
        const userIndex = findUserInApplications(userId, applications);
        if (applications[userIndex].role === 'trainee') {
            await this.http.post<{}>('user/removeTraineeFromTraining', {
                userId,
                trainingId : this.trainingData.training.id,
                groupId: applications[userIndex].groupId,
            });
        }
        if (applications[userIndex].role === 'coach') {
            await this.http.post<{}>('user/removeCoachFromTraining', {
                userId,
                trainingId : this.trainingData.training.id,
                groupId: applications[userIndex].groupId,
            });
        }
        this.trainingData.training.payments.map( async payment => {
            if ( payment.user.id === userId ) {
                await this.http.delete(`finance/${payment.id}`);
            }
        });
        this.snackBar.open('Application withdrawal successful', 'OK', { duration: 3000});
    }

    openAdministrateDialog(): void {
        this.dialog.open(ManageTrainingFinancesDialogComponent, {
            width: '50vw',
            data: this.trainingData.training,
        });
    }
}
