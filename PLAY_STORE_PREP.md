# Bash MM Play Store Preparation

## Upload Artifact

- App name: Bash MM
- Android package name: `com.bashmmoney.app`
- Version name: `1.0.0`
- Version code: `1`
- Play upload file: `artifacts/sacco-app/android/app/build/outputs/bundle/release/app-release.aab`
- Test/install file: `artifacts/sacco-app/android/app/build/outputs/apk/release/app-release-signed.apk`

Google Play requires Android App Bundle (`.aab`) uploads for new apps. The APK is still useful for direct phone testing, but upload the `.aab` to Play Console.

## Store Listing Draft

Short description:

> Member savings, loan, transaction, and reporting management for Bash MM.

Full description:

> Bash MM helps authorised administrators manage member accounts, savings deposits, withdrawals, loan disbursements, repayments, member profile records, signatures, and financial reports. Members can securely log in to view their account details, balances, transaction history, and export statements.
>
> The app is intended for Bash M. Money Financial Services operations and registered members.

Suggested category:

> Finance

Ads:

> No ads.

Target audience:

> Adults only. Not designed for children.

## Privacy And Data Safety Draft

Privacy policy is required before public release. Host it on a public URL and paste that URL in Play Console.

The app handles:

- Name
- Phone number
- National ID number
- Account number
- Profile photo
- Signature image
- Savings and loan transaction records
- Login credentials/PINs

Data is used for:

- Account creation and administration
- Member login
- Savings and loan record keeping
- Transaction reporting and exported statements

Data is transmitted to the Render backend API over HTTPS. Do not mark the app as collecting "no data" in Play Console.

## Play Console Steps

1. Create the app in Play Console.
2. Use package name `com.bashmmoney.app`.
3. Upload `app-release.aab` to an internal testing track first.
4. Add store listing text, screenshots, icon, and feature graphic.
5. Complete App access with admin/member test login instructions.
6. Complete Data safety and privacy policy URL.
7. Complete Content rating questionnaire.
8. Complete Target audience and content.
9. Confirm the app has no ads.
10. Run pre-review checks, then submit for review.

## App Access For Google Review

Provide Google a test account so reviewers can enter the app:

Admin email: `kakembob1@gmail.com`

Admin password: `admin@1`

Note: if the production admin password is changed before review, update the Play Console app access instructions.
