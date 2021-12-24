import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterTrainingDialogComponent } from './register-training-dialog.component';

describe('RegisterTrainingDialogComponent', () => {
  let component: RegisterTrainingDialogComponent;
  let fixture: ComponentFixture<RegisterTrainingDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RegisterTrainingDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RegisterTrainingDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
