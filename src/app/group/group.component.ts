import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { AuthService } from '../auth.service';
import { HttpService } from '../httpService';
import { RawGroup, RawCoach, RawUser } from '../types';

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

    constructor(
        private http: HttpService,
        private authService: AuthService
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
        this.groups = this.unfilteredGroups;
    }
    async refreshTrainees(groupId: number): Promise<void> {
        const group = await this.http.get<RawGroup>(`group/${groupId}`);
        this.usersNotInGroup = [];
        const users = await this.http.get<RawUser[]>(`user/getByRole/trainee`);
        for (const user of users ) {
            if ( !group.members.map( trainee => trainee.id ).includes(user.id)) {
                this.usersNotInGroup.push(user);
            }
        }
    }
    async refreshCoaches(groupId: number): Promise<void> {
        const group = await this.http.get<RawGroup>(`group/${groupId}`);
        this.coachesNotInGroup = [];
        const coaches = await this.http.get<RawCoach[]>(`coach`);
        for (const coach of coaches ) {
            if ( !group.coaches.map( coach => coach.id ).includes(coach.id)) {
                this.coachesNotInGroup.push(coach.user);
            }
        }
        console.log('Coaches not in group: ', this.coachesNotInGroup);
        console.log('Group coaches: ', group.coaches);
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
        const filteredGroups = this.unfilteredGroups.filter(group => group.name.toLowerCase().includes(filterString.toLowerCase()));
        this.groups = filteredGroups;
    }
}
