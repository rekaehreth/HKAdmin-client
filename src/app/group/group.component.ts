import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { AuthService } from '../auth.service';
import { HttpService } from '../httpService';
import { RawGroup, RawCoach, RawUser } from '../types';
import {MatDialog} from '@angular/material/dialog';
import {ConfirmDialogComponent} from '../confirm-dialog/confirm-dialog.component';

@Component({
    selector: 'app-group',
    templateUrl: './group.component.html',
    styleUrls: ['./group.component.scss']
})
export class GroupComponent implements OnInit {
    groups: RawGroup[] = [];
    unfilteredGroups: RawGroup[] = [];
    roles: string[] = [];
    usersNotInGroup: RawUser[] = [];
    coachesNotInGroup: RawUser[] = [];
    selectedUser!: RawUser;
    selectedCoach!: RawUser;
    nameFilterControl: FormControl = new FormControl('');
    newGroupName = '';

    constructor(
        private http: HttpService,
        private authService: AuthService,
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.roles = this.authService.getLoggedInRoles();
        this.getGroups().then(_ => {
            this.nameFilterControl.valueChanges.subscribe(value => this.filterByName(value));
        });
    }
    async getGroups(): Promise<void> {
        if ( this.roles.includes('admin') ) {
            this.unfilteredGroups = await this.http.get<RawGroup[]>('group');
        }
        else if ( this.roles.includes('coach') ) {
            const userId = this.authService.getLoggedInUserId();
            const coach = await this.http.get<RawCoach>(`user/getCoach/${userId}`);
            this.unfilteredGroups = coach.groups;
        }
        this.groups = this.unfilteredGroups.sort((group1, group2) => group1.name.localeCompare(group2.name));
    }
    async refreshTrainees(groupId: number): Promise<void> {
        const group = await this.http.get<RawGroup>(`group/${groupId}`);
        this.usersNotInGroup = [];
        const users = await this.http.get<RawUser[]>(`user/getByRole/trainee`);
        for (const user of users ) {
            if ( !group.members.map( trainee => trainee.id ).includes(user.id) &&
                    !group.coaches.map( coach => coach.user.id ).includes(user.id)) {
                this.usersNotInGroup.push(user);
            }
        }
    }
    async refreshCoaches(groupId: number): Promise<void> {
        const group = await this.http.get<RawGroup>(`group/${groupId}`);
        this.coachesNotInGroup = [];
        const coaches = await this.http.get<RawCoach[]>(`coach`);
        for (const coach of coaches ) {
            if ( !group.coaches.map( mappedCoach => mappedCoach.id ).includes(coach.id) &&
                !group.members.map( trainee => trainee.id ).includes(coach.user.id)) {
                this.coachesNotInGroup.push(coach.user);
            }
        }
    }
    async addTrainee(userId: number, groupId: number): Promise<void> {
        await this.http.post<{}>('user/addTraineeToGroup', {
            userId,
            groupId,
        });
        await this.getGroups();
    }
    async addCoach(userId: number, groupId: number): Promise<void> {
        await this.http.post<{}>('user/addCoachToGroup', {
            userId,
            groupId,
        });
        await this.getGroups();
    }
    async removeTrainee(userId: number, groupId: number): Promise<void> {
        await this.http.post<{}>('user/removeTraineeFromGroup', {
            userId,
            groupId,
        });
        await this.getGroups();
    }
    async removeCoach(userId: number, groupId: number): Promise<void> {
        await this.http.post<{}>('user/removeCoachFromGroup', {
            userId,
            groupId,
        });
        await this.getGroups();
    }
    filterByName(filterString: string): void {
        this.groups =  this.unfilteredGroups.filter(group => group.name.toLowerCase().includes(filterString.toLowerCase()));
    }

    async addNewGroup(): Promise<void> {
        if (this.newGroupName !== ''){
            await this.http.post('group/new', {name: this.newGroupName});
            this.newGroupName = '';
            await this.getGroups();
        }
    }

    async deleteGroup(event: Event, groupId: number): Promise<void>{
        event.stopPropagation();
        const dialogRef = this.dialog.open(ConfirmDialogComponent, { data: 'This group will be permanently deleted. Are you sure?'});
        dialogRef.afterClosed().subscribe(async result => {
            if (result.result === 'confirm'){
                await this.http.delete(`group/${groupId}`);
                await this.getGroups();
            }
        });
    }

    handleInput(event: KeyboardEvent): void{
        event.stopPropagation();
    }
}
