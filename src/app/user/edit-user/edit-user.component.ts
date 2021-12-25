import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSelectionList } from '@angular/material/list';

@Component({
    selector: 'app-edit-user',
    templateUrl: './edit-user.component.html',
    styleUrls: ['./edit-user.component.scss']
})
export class EditUserComponent implements OnInit {
    @ViewChild('userRoles')
    userRoles?: MatSelectionList;

    roles: string[] = ['admin', 'coach', 'trainee'];
    selectedRoles: string[] = [];

    constructor(
        public dialogRef: MatDialogRef<EditUserComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any) { }
    ngOnInit(): void { }
    close(action: string): void {
        if (action === 'save') {
            this.dialogRef.close({ action: 'save', newRoles: this.selectedRoles });
        }
        else {
            this.dialogRef.close({ action: 'cancel' });
        }
    }
    updateSelected(): void {
        if ( this.userRoles ) {
            this.selectedRoles = [];
            for ( const selectedElement of this.userRoles?.selectedOptions.selected) {
                this.selectedRoles.push(selectedElement.value);
            }
        }
    }
}
