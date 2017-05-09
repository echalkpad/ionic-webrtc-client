import { SocketService } from './../../services/socketService';
import { Component, ViewChild, OnDestroy } from '@angular/core';
import { NavController, ViewController } from 'ionic-angular';
import { UserService } from '../../common/user';
import * as Peer from 'simple-peer';
import 'rxjs/add/operator/toPromise';

const VIDEO_CONSTRAINTS = {
  audio: true,
  video: {
    width: 640,
    frameRate: 15
  }
};

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage implements OnDestroy {
  @ViewChild('localVideo') localVideo;
  @ViewChild('selfVideo') selfVideo;
  @ViewChild('textarea') textarea;

  private user = {};
  private peer;
  private getTimeoutId = null;

  constructor(
    public navCtrl: NavController,
    private viewCtrl: ViewController,
    private socketService: SocketService,
    private userService: UserService
  ) {
    this.userService.getUser().then((user) => {
      this.user = user;
    });

    navigator.getUserMedia(VIDEO_CONSTRAINTS, (stream) => {
      this.selfVideo.nativeElement.src = window.URL.createObjectURL(stream);
      this.selfVideo.nativeElement.play();

      this.peer = new Peer({
        initiator: true,
        trickle: false,
        reconnectTimer: 60000,
        stream,
      });

      this.peer.on('signal', (data) => {
        const connection = JSON.stringify(data);

        this.userService.offerRoom(connection).subscribe((result) => {
          this.socketService.answerRoom().subscribe((data) => {
            const answerString = data['answer'];
            if (answerString) {
              this.connect(answerString);
            }
          });
        });
      });

      this.peer.on('stream', (stream) => {
        this.localVideo.nativeElement.src = window.URL.createObjectURL(stream);
        this.localVideo.nativeElement.play();
      });
    }, err => console.error(err));
  }

  getRoom() {
    return this.userService.getRoom().toPromise().then(({ room }) => {
      if (!room.answer) {
        return new Promise((resolve) => {
          this.getTimeoutId = setTimeout(() => {
            resolve(this.getRoom());
          }, 2000);
        });
      }
      return room;
    });
  }

  connect(answer: string) {
    this.peer.signal(JSON.parse(answer));
  }

  ngOnDestroy() {
    if (this.getTimeoutId) {
      clearTimeout(this.getTimeoutId);
    }
  }
}
