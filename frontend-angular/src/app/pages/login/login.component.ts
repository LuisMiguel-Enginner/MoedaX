import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [false],
  });
  message = '';
  messageType: 'error' | 'success' = 'error';
  loading = false;
  passwordVisible = false;

  async ngOnInit(): Promise<void> {
    const savedEmail = localStorage.getItem('moedax_remember_email');
    if (savedEmail) {
      this.form.patchValue({ email: savedEmail, remember: true });
    }

    try {
      if (await this.auth.hasSession()) {
        await this.router.navigateByUrl('/');
      }
    } catch (error) {
      this.showMessage(this.auth.mapError(error));
    }
  }

  get emailInvalid(): boolean {
    return this.form.controls.email.touched && this.form.controls.email.invalid;
  }

  get passwordInvalid(): boolean {
    return this.form.controls.password.touched && this.form.controls.password.invalid;
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading) {
      return;
    }

    this.loading = true;
    this.message = '';
    const { email, password, remember } = this.form.getRawValue();
    try {
      await this.auth.signIn(email.trim(), password);
      if (remember) {
        localStorage.setItem('moedax_remember_email', email.trim());
      } else {
        localStorage.removeItem('moedax_remember_email');
      }
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.showMessage(this.auth.mapError(error));
    } finally {
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }

  async signInWithGoogle(): Promise<void> {
    this.loading = true;
    this.message = '';
    try {
      await this.auth.signInWithGoogle(`${window.location.origin}/`);
    } catch (error) {
      this.showMessage(this.auth.mapError(error));
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }

  async resetPassword(): Promise<void> {
    const email = this.form.controls.email;
    email.markAsTouched();
    if (email.invalid) {
      this.showMessage('Informe um e-mail válido para receber o link de recuperação.');
      return;
    }

    this.loading = true;
    this.message = '';
    try {
      await this.auth.resetPassword(email.value.trim(), `${window.location.origin}/login`);
      this.showMessage('Enviamos um link de recuperação para o seu e-mail.', 'success');
    } catch (error) {
      this.showMessage(this.auth.mapError(error));
    } finally {
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }

  private showMessage(message: string, type: 'error' | 'success' = 'error'): void {
    this.message = message;
    this.messageType = type;
    this.changeDetector.markForCheck();
  }
}
