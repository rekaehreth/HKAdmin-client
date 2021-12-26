import { Component, OnInit, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { AuthService } from '../auth.service';
import { HttpService } from '../httpService';
import { RawPayment, RawUser } from '../types';
import { formatFullDate, formatHourDate } from '../utils';

@Component({
    selector: 'app-finance',
    templateUrl: './finance.component.html',
    styleUrls: ['./finance.component.scss']
})
export class FinanceComponent implements OnInit {
    allPayments: RawPayment[] = [];
    userPayments: RawPayment[] = [];
    adminDataSource = new MatTableDataSource<RawPayment>();
    userDataSource = new MatTableDataSource<RawPayment>();

    @ViewChild(MatSort) sort?: MatSort;
    adminDisplayedColumns: string[] = ['date', 'name', 'email', 'amount', 'status', 'actions'];
    userDisplayedColumns: string[] = ['date', 'amount', 'status', 'actions'];

    roles: string[] = [];
    user!: RawUser;

    formatFullDate = formatFullDate;
    formatHourDate = formatHourDate;

    constructor(
        private http: HttpService,
        private authService: AuthService,
    ) { }

    ngOnInit(): void {
        this.loadPayments();
    }
    ngAfterViewInit(): void {
        if (this.sort) {
            this.adminDataSource.sort = this.sort;
            this.userDataSource.sort = this.sort;
        }
    }
    async loadPayments(): Promise<void> {
        this.roles = this.authService.getLoggedInRoles();
        if ( this.roles.includes('admin')) {
            await this.loadAdminPayments();
        }
        await this.loadUserPayments();
        this.adminDataSource = new MatTableDataSource(this.allPayments);
        this.userDataSource = new MatTableDataSource(this.userPayments);
        if (this.sort) {
            this.adminDataSource.sort = this.sort;
            this.userDataSource.sort = this.sort;
        }
    }
    async loadAdminPayments(): Promise<void> {
        this.allPayments = await this.http.get<RawPayment[]>(`finance`);
    }
    async loadUserPayments(): Promise<void> {
        const userId = this.authService.getLoggedInUserId();
        this.userPayments = await this.http.get<RawPayment[]>(`finance/getByUser/${userId}`);
    }
    async changePaymentStatus(payment: RawPayment, index: number, status: string): Promise<void> {
        await this.http.post<RawPayment>('finance/modify', {
            userId : payment.user.id,
            paymentId : payment.id,
            trainingId: payment.training.id,
            rawPaymentData : {
                status,
                time : Date(),
            }});
        await this.loadPayments();
    }
    // **TODO** when deleting a user, remove user from payments linked to it
}
