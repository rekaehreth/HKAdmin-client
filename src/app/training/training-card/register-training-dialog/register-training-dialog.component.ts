import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {RawGroup} from '../../../types';
import {FormControl} from '@angular/forms';

@Component({
  selector: 'app-register-training-dialog',
  templateUrl: './register-training-dialog.component.html',
  styleUrls: ['./register-training-dialog.component.scss']
})
export class RegisterTrainingDialogComponent implements OnInit {
    roleSelectionNeeded = false;
    roleControl = new FormControl();
    groupControl = new FormControl();
    selectedRole = 'Trainee';
    selectedGroup: RawGroup | undefined;
    selectableGroups: RawGroup[] = [];
    constructor(
        public dialogRef: MatDialogRef<RegisterTrainingDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: {traineeGroups: RawGroup[], coachGroups: RawGroup[]},
    ) { }

    ngOnInit(): void {
        this.roleSelectionNeeded =
            this.data.traineeGroups !== undefined &&
            this.data.traineeGroups.length > 0  &&
            this.data.coachGroups !== undefined &&
            this.data.coachGroups.length > 0;
        this.selectableGroups = this.data.traineeGroups;
        if ( this.data.traineeGroups === undefined || this.data.traineeGroups.length === 0){
            this.selectableGroups = this.data.coachGroups;
            this.selectedRole = 'Coach';
        }
        this.selectedGroup = this.selectableGroups[0];
    }

    updateGroupList(): void{
        if (this.selectedRole === 'Trainee'){
            this.selectableGroups = this.data.traineeGroups;
        }else if (this.selectedRole === 'Coach'){
            this.selectableGroups = this.data.coachGroups;
        }
        this.selectedGroup = this.selectableGroups[0];
    }

    continue(): void {
        this.dialogRef.close({role: this.selectedRole, groupId: this.selectedGroup?.id});
    }

    cancel(): void {
        this.dialogRef.close();
    }
}
